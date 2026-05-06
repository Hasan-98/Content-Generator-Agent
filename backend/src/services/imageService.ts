import axios from 'axios';
import FormData from 'form-data';

const KIE_BASE = 'https://api.kie.ai/api/v1/jobs';
const MODEL = 'nano-banana-pro';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120000;

// ───── Multi-model AI image generation ───────────────────────────────────
//
// Supports the same models as image_creator/lib/ai-image-api.ts:
//   - kie-nano-banana       (Kie nano-banana / nano-banana-edit when refs present)
//   - kie-nano-banana-pro   (Kie nano-banana-pro — what the existing code used)
//   - openai-gpt-image-1    (OpenAI gpt-image-1 — /generations or /edits)
//   - openai-gpt-image-2    (OpenAI gpt-image-2 — /generations or /edits)

export type AiImageModel =
  | 'kie-nano-banana'
  | 'kie-nano-banana-pro'
  | 'openai-gpt-image-1'
  | 'openai-gpt-image-2';

export interface ReferenceImage {
  /** Either a data URL (data:image/...;base64,XXX) or a public https URL */
  src: string;
}

export interface GenerateImageOptions {
  model: AiImageModel;
  prompt: string;
  /** "1024x1024" | "1024x1536" | "1536x1024" | "16:9" | "1:1" | "auto" — model-dependent */
  size?: string;
  /** Number of variations requested (1–4, default 1) */
  n?: number;
  /** Reference images for image-edit (max 4). When present, uses model's edit endpoint. */
  referenceImages?: ReferenceImage[];
  /** API key resolved by the route layer (user-scoped or env fallback). Required. */
  apiKey: string;
}

export interface GeneratedImageResult {
  /** Data URL or public URL — caller picks based on use case */
  url: string;
  /** True if `url` is a `data:` URL (b64-decoded by caller) vs an https URL */
  isDataUrl: boolean;
  meta?: Record<string, unknown>;
}

export async function generateAiImage(opts: GenerateImageOptions): Promise<GeneratedImageResult[]> {
  if (opts.model.startsWith('openai-')) {
    const modelId = opts.model === 'openai-gpt-image-2' ? 'gpt-image-2' : 'gpt-image-1';
    return generateOpenAi(opts, modelId);
  }
  if (opts.model === 'kie-nano-banana') {
    return generateKieNanoBanana(opts);
  }
  if (opts.model === 'kie-nano-banana-pro') {
    // Existing aspect-ratio-based pro pipeline
    const ratio = (opts.size === '16:9' || opts.size === '1:1') ? opts.size : '1:1';
    const url = await generateImageWithKie(opts.prompt, ratio as '16:9' | '1:1', opts.apiKey);
    if (!url) return [];
    return [{ url, isDataUrl: false, meta: { provider: 'kie', model: MODEL } }];
  }
  throw new Error(`unknown model: ${opts.model}`);
}

// ───── OpenAI gpt-image-1 / gpt-image-2 ─────────────────────────────────

async function generateOpenAi(
  opts: GenerateImageOptions,
  modelId: 'gpt-image-1' | 'gpt-image-2',
): Promise<GeneratedImageResult[]> {
  const refs = opts.referenceImages ?? [];
  const hasRef = refs.length > 0;
  const size = opts.size ?? '1024x1024';
  const n = opts.n ?? 1;

  let response;
  if (hasRef) {
    const fd = new FormData();
    fd.append('model', modelId);
    fd.append('prompt', opts.prompt);
    fd.append('size', size);
    fd.append('n', String(n));
    for (let i = 0; i < refs.length; i++) {
      const buf = await sourceToBuffer(refs[i].src);
      fd.append('image[]', buf, { filename: `ref-${i}.png`, contentType: 'image/png' });
    }
    response = await axios.post('https://api.openai.com/v1/images/edits', fd, {
      headers: { ...fd.getHeaders(), Authorization: `Bearer ${opts.apiKey}` },
      timeout: 120000,
    });
  } else {
    response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      { model: modelId, prompt: opts.prompt, size, n },
      {
        headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 120000,
      },
    );
  }

  const items: Array<{ b64_json?: string; url?: string }> = response.data?.data ?? [];
  return items.map<GeneratedImageResult>((it) => {
    if (it.b64_json) {
      return { url: `data:image/png;base64,${it.b64_json}`, isDataUrl: true, meta: { provider: 'openai', model: modelId } };
    }
    return { url: it.url ?? '', isDataUrl: false, meta: { provider: 'openai', model: modelId } };
  }).filter((r) => r.url);
}

async function sourceToBuffer(src: string): Promise<Buffer> {
  if (src.startsWith('data:')) {
    const idx = src.indexOf('base64,');
    if (idx < 0) throw new Error('Invalid data URL: missing base64 segment');
    return Buffer.from(src.slice(idx + 7), 'base64');
  }
  const res = await axios.get<ArrayBuffer>(src, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

// ───── Kie Nano Banana (text-to-image / image-edit) ─────────────────────

const KIE_NANO_BANANA = 'nano-banana';
const KIE_NANO_BANANA_EDIT = 'nano-banana-edit';

async function generateKieNanoBanana(opts: GenerateImageOptions): Promise<GeneratedImageResult[]> {
  const refs = opts.referenceImages ?? [];
  const hasRef = refs.length > 0;
  const model = hasRef ? KIE_NANO_BANANA_EDIT : KIE_NANO_BANANA;

  const input: Record<string, unknown> = { prompt: opts.prompt };
  if (hasRef) {
    const uploaded = await Promise.all(refs.map((r) => uploadKieFile(opts.apiKey, r.src)));
    input.image_urls = uploaded;
  }
  if (opts.n && opts.n > 1) input.num_images = opts.n;

  const taskId = await createKieJob(opts.apiKey, model, input);
  const urls = await pollKieResultUrls(opts.apiKey, taskId);
  return urls.map((url) => ({ url, isDataUrl: false, meta: { provider: 'kie', model } }));
}

// Generic Kie job submit (used by nano-banana variants).
async function createKieJob(apiKey: string, model: string, input: Record<string, unknown>): Promise<string> {
  const { data } = await axios.post(
    `${KIE_BASE}/createTask`,
    { model, input },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 },
  );
  const taskId = data?.data?.taskId;
  if (!taskId) throw new Error('Kie createTask returned no taskId');
  return taskId;
}

// Generic Kie poll → returns an array of result URLs (may be 1+).
async function pollKieResultUrls(apiKey: string, taskId: string): Promise<string[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const { data } = await axios.get(`${KIE_BASE}/recordInfo`, {
      params: { taskId },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000,
    });
    const d = data?.data;
    if (!d) continue;
    if (d.state === 'success') {
      let resultJson = d.resultJson;
      if (Array.isArray(resultJson)) resultJson = resultJson[0];
      try {
        const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
        const urls: string[] = parsed?.resultUrls ?? [];
        return urls.filter(Boolean);
      } catch {
        return [];
      }
    }
    if (d.state === 'failed') {
      throw new Error(`Kie task failed: ${d.failMsg ?? 'unknown'}`);
    }
  }
  throw new Error('Kie task polling timed out');
}

// Upload a data URL (or remote URL) to Kie's hosted file endpoint and return the public URL.
async function uploadKieFile(apiKey: string, src: string): Promise<string> {
  const buf = await sourceToBuffer(src);
  const fd = new FormData();
  fd.append('file', buf, { filename: 'ref.png', contentType: 'image/png' });
  fd.append('uploadPath', 'images/banner-creator/refs');
  const { data } = await axios.post('https://api.kie.ai/api/v1/files/upload', fd, {
    headers: { ...fd.getHeaders(), Authorization: `Bearer ${apiKey}` },
    timeout: 60000,
  });
  const url = data?.data?.url ?? data?.data?.fileUrl;
  if (!url) throw new Error('Kie upload returned no URL');
  return url;
}

// ───── Existing nano-banana-pro path (unchanged) ─────────────────────────

async function createKieTask(prompt: string, aspectRatio: '16:9' | '1:1', userApiKey?: string): Promise<string> {
  const apiKey = userApiKey || process.env.KIE_AI_API_KEY;
  if (!apiKey) throw new Error('KIE_AI_API_KEY is not set');

  const response = await axios.post(
    `${KIE_BASE}/createTask`,
    {
      model: MODEL,
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: '2K',
        output_format: 'png',
      },
    },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 }
  );

  const taskId = response.data?.data?.taskId;
  if (!taskId) throw new Error('kie.ai createTask returned no taskId');
  return taskId;
}

async function pollKieResult(taskId: string, userApiKey?: string): Promise<string | null> {
  const apiKey = userApiKey || process.env.KIE_AI_API_KEY;
  if (!apiKey) throw new Error('KIE_AI_API_KEY is not set');

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const response = await axios.get(`${KIE_BASE}/recordInfo`, {
      params: { taskId },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000,
    });

    const data = response.data?.data;
    if (!data) continue;

    if (data.state === 'success') {
      // resultJson is a JSON string containing { resultUrls: [...] }
      let resultJson = data.resultJson;
      if (Array.isArray(resultJson)) resultJson = resultJson[0];

      try {
        const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
        const url: string = parsed?.resultUrls?.[0];
        if (url) return url;
      } catch {
        // fallback: regex scan
        const str = JSON.stringify(resultJson);
        const match = str.match(/https?:\/\/[^"'\\]+\.png/);
        if (match) return match[0];
      }
      return null;
    }

    if (data.state === 'failed') {
      console.error('[imageService] kie.ai task failed:', data.failMsg);
      return null;
    }
    // state is pending/processing — keep polling
  }

  console.error('[imageService] kie.ai poll timed out for taskId:', taskId);
  return null;
}

export async function generateImageWithKie(
  prompt: string,
  aspectRatio: '16:9' | '1:1' = '1:1',
  kieApiKey?: string
): Promise<string | null> {
  try {
    const taskId = await createKieTask(prompt, aspectRatio, kieApiKey);
    console.log(`[imageService] task created: ${taskId} (${aspectRatio})`);
    const url = await pollKieResult(taskId, kieApiKey);
    if (url) console.log(`[imageService] task done: ${taskId} → ${url}`);
    return url;
  } catch (err) {
    console.error('[imageService] generateImageWithKie error:', err);
    return null;
  }
}

// Legacy fallback — kept for any callers that still use IMAGE_API_URL
export async function generateImage(prompt: string): Promise<string | null> {
  const imageApiUrl = process.env.IMAGE_API_URL;
  if (imageApiUrl) {
    try {
      const response = await axios.post(imageApiUrl, { prompt }, { timeout: 60000 });
      return response.data?.imageUrl || response.data?.url || null;
    } catch (err) {
      console.error('[imageService] generateImage error:', err);
      return null;
    }
  }
  // Fall through to kie.ai if no IMAGE_API_URL
  return generateImageWithKie(prompt, '1:1');
}
