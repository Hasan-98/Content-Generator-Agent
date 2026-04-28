import OpenAI from 'openai';

const defaultClient = new OpenAI({ apiKey: process.env.OPEN_API });

function getClient(apiKey?: string): OpenAI {
  if (apiKey) return new OpenAI({ apiKey });
  return defaultClient;
}

/**
 * Apply reading dictionary replacements to narration text.
 * Replaces kanji with their TTS-friendly readings.
 */
export function applyDictionary(
  text: string,
  dictionary: { kanji: string; reading: string }[]
): string {
  let result = text;
  for (const entry of dictionary) {
    result = result.replace(new RegExp(entry.kanji, 'g'), entry.reading);
  }
  return result;
}

/**
 * Generate TTS audio using OpenAI TTS API.
 * Returns the raw MP3 buffer (no longer saved to disk).
 */
export type TtsVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

export const TTS_VOICES: TtsVoice[] = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];

export async function generateTtsAudio(
  narration: string,
  scriptId: string,
  apiKey?: string,
  voice: TtsVoice = 'onyx'
): Promise<Buffer> {
  const client = getClient(apiKey);

  const response = await client.audio.speech.create({
    model: 'tts-1-hd',
    input: narration,
    voice,
    response_format: 'mp3',
  });

  return Buffer.from(await response.arrayBuffer());
}
