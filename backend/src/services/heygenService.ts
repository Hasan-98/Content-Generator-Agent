import axios from 'axios';
import fs from 'fs';
import path from 'path';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const TALKING_PHOTO_ID = process.env.HEYGEN_TALKING_PHOTO_ID || '';

const heygenApi = axios.create({
  headers: {
    'X-Api-Key': HEYGEN_API_KEY,
    'Content-Type': 'application/json',
  },
});

/**
 * List available talking photos from HeyGen.
 */
export async function listTalkingPhotos(): Promise<
  { id: string; name: string; imageUrl: string }[]
> {
  const response = await heygenApi.get('https://api.heygen.com/v2/talking_photo.list');
  const list = response.data.data?.talking_photos || [];
  return list.map((p: any) => ({
    id: p.talking_photo_id || p.id,
    name: p.talking_photo_name || p.name || 'Unnamed',
    imageUrl: p.preview_image_url || p.image_url || '',
  }));
}

/**
 * Upload an MP3 audio file to HeyGen as an asset.
 * Returns the asset ID.
 */
export async function uploadAudioToHeygen(audioFilePath: string): Promise<string> {
  const audioBuffer = fs.readFileSync(audioFilePath);

  const response = await axios.post('https://upload.heygen.com/v1/asset', audioBuffer, {
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': 'audio/mpeg',
    },
    maxBodyLength: Infinity,
  });

  return response.data.data?.id || '';
}

/**
 * Create a HeyGen video from audio assets.
 * Each section gets its own video_input with the talking photo avatar.
 */
export async function createHeygenVideo(
  title: string,
  audioAssetIds: string[],
  avatarId?: string,
  orientation: string = 'horizontal'
): Promise<{ videoId: string }> {
  const talkingPhotoId = avatarId || TALKING_PHOTO_ID;
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

  const response = await heygenApi.post('https://api.heygen.com/v2/video/generate', {
    video_inputs: videoInputs,
    dimension,
    title,
  });

  return {
    videoId: response.data.data?.video_id || '',
  };
}

/**
 * Check HeyGen video generation status.
 */
export async function checkHeygenStatus(videoId: string): Promise<{
  status: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  error: string;
}> {
  const response = await heygenApi.get(
    `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`
  );

  const data = response.data.data || {};
  return {
    status: data.status || 'unknown',
    videoUrl: data.video_url || '',
    thumbnailUrl: data.thumbnail_url || '',
    duration: data.duration || 0,
    error: data.error ? JSON.stringify(data.error) : '',
  };
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
    const assetId = await uploadAudioToHeygen(filepath);
    assetIds.push(assetId);
  }

  return assetIds;
}
