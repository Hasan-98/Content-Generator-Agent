import axios from 'axios';

export async function generateImage(prompt: string): Promise<string | null> {
  const imageApiUrl = process.env.IMAGE_API_URL;
  if (!imageApiUrl) {
    console.log('[imageService] IMAGE_API_URL not set, returning null');
    return null;
  }

  try {
    const response = await axios.post(imageApiUrl, { prompt }, { timeout: 60000 });
    return response.data?.imageUrl || response.data?.url || null;
  } catch (err) {
    console.error('[imageService] generateImage error:', err);
    return null;
  }
}
