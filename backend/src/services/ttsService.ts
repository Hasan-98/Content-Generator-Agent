import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const defaultClient = new OpenAI({ apiKey: process.env.OPEN_API });

function getClient(apiKey?: string): OpenAI {
  if (apiKey) return new OpenAI({ apiKey });
  return defaultClient;
}

// Ensure audio directory exists
const AUDIO_DIR = path.join(__dirname, '..', '..', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
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
 * Returns the filename of the saved MP3.
 */
export type TtsVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

export const TTS_VOICES: TtsVoice[] = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];

export async function generateTtsAudio(
  narration: string,
  scriptId: string,
  apiKey?: string,
  voice: TtsVoice = 'onyx'
): Promise<string> {
  const client = getClient(apiKey);

  const response = await client.audio.speech.create({
    model: 'tts-1-hd',
    input: narration,
    voice,
    response_format: 'mp3',
  });

  const filename = `${scriptId}-${Date.now()}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  return filename;
}

/**
 * Delete an audio file if it exists.
 */
export function deleteAudioFile(filename: string): void {
  const filepath = path.join(AUDIO_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}
