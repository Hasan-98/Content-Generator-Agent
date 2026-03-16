import axios from 'axios';

const KIE_BASE = 'https://api.kie.ai/api/v1/jobs';
const MODEL = 'nano-banana-pro';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120000;

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
