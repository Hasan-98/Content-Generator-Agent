import axios from 'axios';
import fs from 'fs';
import path from 'path';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const TALKING_PHOTO_ID = process.env.HEYGEN_TALKING_PHOTO_ID || '';

// ============================================================================
// WF0 — Photo Avatar Training (create a custom HeyGen avatar from a photo)
// ============================================================================

/**
 * Detect image MIME type from file magic bytes.
 * HeyGen's upload endpoint requires the correct Content-Type.
 */
function detectImageMime(buffer: Buffer): string {
  if (buffer.length < 12) return 'image/jpeg';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  // WEBP: "RIFF"...."WEBP"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp';
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Download an image from a URL or read from local uploads directory.
 */
export async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  // Handle local uploads (from file upload feature)
  if (url.startsWith('/uploads/')) {
    const fs = await import('fs');
    const path = await import('path');
    // Strip leading slash so path.join doesn't treat it as absolute
    const localPath = path.join(__dirname, '..', '..', url.slice(1));
    if (!fs.existsSync(localPath)) {
      throw new Error(`Upload file not found: ${url} — the file may have been deleted or lost during deployment. Please re-upload the image.`);
    }
    const buffer = fs.readFileSync(localPath);
    const contentType = detectImageMime(buffer);
    return { buffer, contentType };
  }

  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 50 * 1024 * 1024, // 50MB cap
  });
  const buffer = Buffer.from(response.data);
  const headerMime = (response.headers['content-type'] as string | undefined)?.split(';')[0]?.trim();
  const contentType = headerMime && headerMime.startsWith('image/') ? headerMime : detectImageMime(buffer);
  return { buffer, contentType };
}

function resolveApiKey(userKey?: string): string {
  const key = userKey || HEYGEN_API_KEY;
  if (!key) throw new Error('HeyGen API key is not configured');
  return key;
}

/**
 * Upload any file (image or video) to HeyGen's asset service.
 * Returns the asset key and the HeyGen-hosted URL.
 */
export async function uploadAssetToHeygen(
  buffer: Buffer,
  contentType: string,
  userApiKey?: string
): Promise<{ assetKey: string; hostedUrl: string }> {
  const apiKey = resolveApiKey(userApiKey);
  const response = await axios.post('https://upload.heygen.com/v1/asset', buffer, {
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': contentType,
    },
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  console.log('[heygenService] uploadAssetToHeygen response:', JSON.stringify(response.data).slice(0, 500));
  const data = response.data?.data || {};
  const assetKey = data.image_key || data.video_key || data.id || '';
  if (!assetKey) {
    throw new Error('HeyGen asset upload returned no key: ' + JSON.stringify(response.data).slice(0, 300));
  }
  const hostedUrl = data.url || '';
  console.log('[heygenService] asset key:', assetKey, 'url:', hostedUrl);
  return { assetKey, hostedUrl };
}

/** @deprecated Use uploadAssetToHeygen instead */
export async function uploadImageToHeygen(
  buffer: Buffer,
  contentType: string,
  userApiKey?: string
): Promise<string> {
  const { assetKey } = await uploadAssetToHeygen(buffer, contentType, userApiKey);
  return assetKey;
}

/**
 * Create a photo_avatar group using a previously uploaded image_key.
 * Returns the group_id and the HeyGen-hosted image_url.
 */
export async function createAvatarGroup(
  name: string,
  imageKey: string,
  userApiKey?: string
): Promise<{ groupId: string; heygenImageUrl: string }> {
  const apiKey = resolveApiKey(userApiKey);
  const body = { name, image_key: imageKey };
  console.log('[heygenService] createAvatarGroup request body:', JSON.stringify(body));
  const response = await axios.post(
    'https://api.heygen.com/v2/photo_avatar/avatar_group/create',
    body,
    {
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  console.log('[heygenService] createAvatarGroup response:', JSON.stringify(response.data).slice(0, 500));
  const data = response.data?.data || {};
  const groupId = data.id || data.group_id || '';
  if (!groupId) {
    throw new Error('HeyGen avatar_group/create returned no id: ' + JSON.stringify(response.data).slice(0, 300));
  }
  const heygenImageUrl = data.image_url || '';
  return { groupId, heygenImageUrl };
}

/**
 * Kick off photo_avatar training. HeyGen does this async; we tolerate non-2xx
 * (matching the n8n "neverError: true" behaviour).
 */
export async function trainAvatarGroup(groupId: string, userApiKey?: string): Promise<void> {
  const apiKey = resolveApiKey(userApiKey);
  try {
    await axios.post(
      'https://api.heygen.com/v2/photo_avatar/train',
      { group_id: groupId },
      {
        headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
  } catch (err: any) {
    const errData = err?.response?.data;
    const errMsg = errData?.error?.message || errData?.message || err?.message || '';
    console.warn('[heygenService] trainAvatarGroup error:', errData || errMsg);

    // Fatal errors — no point polling, fail immediately
    if (errMsg.includes('No valid image') || errMsg.includes('invalid_parameter')) {
      throw new Error(`HeyGen training rejected: ${errMsg}`);
    }
    // Otherwise treat as non-fatal (e.g. training already in progress)
  }
}

/**
 * Poll an avatar group's status. Returns the trained avatar_id once ready,
 * or null if still training.
 */
export async function getAvatarGroupStatus(
  groupId: string,
  userApiKey?: string
): Promise<{ avatarId: string | null; raw: any }> {
  const apiKey = resolveApiKey(userApiKey);
  const response = await axios.get(`https://api.heygen.com/v2/photo_avatar/${groupId}`, {
    headers: { 'X-Api-Key': apiKey },
    timeout: 30000,
  });
  const data = response.data?.data || {};
  const looks = data.photo_avatar_list || data.looks || [];
  const first = Array.isArray(looks) && looks.length > 0 ? looks[0] : null;
  const avatarId = (first && (first.id || first.avatar_id || first.talking_photo_id)) || null;
  return { avatarId, raw: data };
}

/**
 * List available talking photos from HeyGen.
 */
export async function listTalkingPhotos(
  userApiKey?: string
): Promise<{ id: string; name: string; imageUrl: string }[]> {
  const apiKey = resolveApiKey(userApiKey);
  const response = await axios.get('https://api.heygen.com/v2/talking_photo.list', {
    headers: { 'X-Api-Key': apiKey },
    timeout: 30000,
  });
  const list = response.data.data?.talking_photos || [];
  return list.map((p: any) => ({
    id: p.talking_photo_id || p.id,
    name: p.talking_photo_name || p.name || 'Unnamed',
    imageUrl: p.preview_image_url || p.image_url || '',
  }));
}

/**
 * Upload an MP3 audio file to HeyGen as an asset.
 * Returns the asset ID. Accepts either a file path or a raw buffer.
 */
export async function uploadAudioToHeygen(
  audioFilePath: string,
  userApiKey?: string
): Promise<{ assetId: string; hostedUrl: string }> {
  const audioBuffer = fs.readFileSync(audioFilePath);
  return uploadAudioBufferToHeygen(audioBuffer, userApiKey);
}

export async function uploadAudioBufferToHeygen(
  audioBuffer: Buffer,
  userApiKey?: string
): Promise<{ assetId: string; hostedUrl: string }> {
  const apiKey = resolveApiKey(userApiKey);
  const response = await axios.post('https://upload.heygen.com/v1/asset', audioBuffer, {
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'audio/mpeg',
    },
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  const data = response.data?.data || {};
  console.log('[heygenService] uploadAudioBuffer response:', JSON.stringify(data).slice(0, 500));
  const assetId = data.id || data.asset_id || '';
  const hostedUrl = data.url || '';
  return { assetId, hostedUrl };
}

/**
 * Create a HeyGen video.
 *
 * Accepts either:
 *  - A single asset_id (WF3-style single combined audio)   — pass `audioAssetIds: [id]`
 *  - An array of asset_ids (per-section pacing)             — pass `audioAssetIds: [id1, id2, ...]`
 *
 * All video_inputs share the same talking_photo avatar, matting: true, and a
 * #00FF00 chromakey background — byte-for-byte the same as n8n WF3.
 */
export async function createHeygenVideo(
  title: string,
  audioAssetIds: string[],
  avatarId?: string,
  orientation: string = 'horizontal',
  userApiKey?: string
): Promise<{ videoId: string }> {
  const apiKey = resolveApiKey(userApiKey);
  const talkingPhotoId = avatarId || TALKING_PHOTO_ID;
  if (!talkingPhotoId) {
    throw new Error('No avatarId or HEYGEN_TALKING_PHOTO_ID configured for HeyGen video generation');
  }

  const dimension = orientation === 'vertical'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };

  const videoInputs = audioAssetIds.map((assetId) => ({
    character: {
      type: 'talking_photo',
      talking_photo_id: talkingPhotoId,
      matting: true,
    },
    voice: {
      type: 'audio',
      audio_asset_id: assetId,
    },
    background: {
      type: 'color',
      value: '#00FF00',
    },
  }));

  const response = await axios.post(
    'https://api.heygen.com/v2/video/generate',
    { video_inputs: videoInputs, dimension, title },
    {
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      timeout: 60000,
    }
  );

  return {
    videoId: response.data?.data?.video_id || '',
  };
}

/**
 * Check HeyGen video generation status.
 */
export async function checkHeygenStatus(
  videoId: string,
  userApiKey?: string
): Promise<{
  status: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  error: string;
}> {
  const apiKey = resolveApiKey(userApiKey);
  const response = await axios.get(
    `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
    {
      headers: { 'X-Api-Key': apiKey },
      timeout: 30000,
    }
  );

  const data = response.data?.data || {};
  return {
    status: data.status || 'unknown',
    videoUrl: data.video_url || '',
    thumbnailUrl: data.thumbnail_url || '',
    duration: data.duration || 0,
    error: data.error ? JSON.stringify(data.error) : '',
  };
}

/**
 * WF3 final step: convert a HeyGen-hosted mp4 to a web-compatible preview via the VPS
 * `/video/convert-preview` endpoint. Returns the converted preview URL.
 *
 * Base URL is read from HEYGEN_PREVIEW_CONVERT_URL (preferred) or derived from
 * REMOTION_RENDER_URL. Returns null on failure (non-fatal — the raw HeyGen URL
 * still works, just not always in every browser).
 */
export async function convertHeygenPreview(videoUrl: string): Promise<string | null> {
  if (!videoUrl) return null;

  const explicit = process.env.HEYGEN_PREVIEW_CONVERT_URL;
  const derived = process.env.REMOTION_RENDER_URL
    ? process.env.REMOTION_RENDER_URL.replace('/render-avatar', '/convert-preview')
    : '';
  const endpoint = explicit || derived;
  if (!endpoint) {
    console.warn('[heygenService] convertHeygenPreview: no HEYGEN_PREVIEW_CONVERT_URL configured');
    return null;
  }

  try {
    const response = await axios.post(
      endpoint,
      { videoUrl },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      }
    );
    const data = response.data || {};
    return data.previewUrl || data.preview_url || data.url || data.videoUrl || null;
  } catch (err: any) {
    console.error('[heygenService] convertHeygenPreview error:', err?.message || err);
    return null;
  }
}

/**
 * Generate per-section TTS audio files and upload each to HeyGen.
 * Returns array of HeyGen asset IDs.
 */
export async function generateAndUploadSectionAudio(
  sections: { narration: string }[],
  scriptId: string,
  openaiApiKey?: string
): Promise<string[]> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: openaiApiKey || process.env.OPEN_API });

  const AUDIO_DIR = path.join(__dirname, '..', '..', 'audio');
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const assetIds: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    // Generate TTS for this section
    const response = await client.audio.speech.create({
      model: 'tts-1-hd',
      input: sections[i].narration,
      voice: 'onyx',
      response_format: 'mp3',
    });

    const filename = `${scriptId}-section-${i}-${Date.now()}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Upload to HeyGen
    const { assetId } = await uploadAudioToHeygen(filepath);
    assetIds.push(assetId);
  }

  return assetIds;
}
