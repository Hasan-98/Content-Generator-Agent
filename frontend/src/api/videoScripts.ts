import client from './client';
import type { VideoScript, VideoScriptSection, TtsDictionary, HeygenAvatar } from '../types';

export async function listVideoScripts(): Promise<VideoScript[]> {
  const res = await client.get('/video-scripts');
  return res.data;
}

export async function getVideoScript(id: string): Promise<VideoScript> {
  const res = await client.get(`/video-scripts/${id}`);
  return res.data;
}

export async function generateVideoScriptApi(articleId: string): Promise<VideoScript> {
  const res = await client.post('/video-scripts/generate', { articleId });
  return res.data;
}

export async function generateTtsApi(scriptId: string): Promise<VideoScript> {
  const res = await client.post(`/video-scripts/${scriptId}/tts`);
  return res.data;
}

export async function uploadCustomAudio(scriptId: string, audioFile: File): Promise<VideoScript> {
  const formData = new FormData();
  formData.append('audio', audioFile);
  const res = await client.post(`/video-scripts/${scriptId}/upload-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateVideoScriptSection(
  sectionId: string,
  data: Partial<Pick<VideoScriptSection, 'heading' | 'narration' | 'points' | 'type' | 'backgroundKeyword' | 'section' | 'visualType' | 'visualNote' | 'imagePrompt'>>
): Promise<VideoScriptSection> {
  const res = await client.patch(`/video-scripts/sections/${sectionId}`, data);
  return res.data;
}

export async function generateSectionImageApi(sectionId: string, prompt: string): Promise<VideoScriptSection> {
  const res = await client.post(`/video-scripts/sections/${sectionId}/generate-image`, { prompt });
  return res.data;
}

export async function deleteVideoScript(id: string): Promise<void> {
  await client.delete(`/video-scripts/${id}`);
}

// Avatars
export async function listAvatarsApi(): Promise<HeygenAvatar[]> {
  const res = await client.get('/video-scripts/avatars');
  return res.data;
}

// Settings
export async function updateVideoSettingsApi(
  scriptId: string,
  data: { avatarId?: string; orientation?: string; theme?: string; pattern?: string; voice?: string }
): Promise<VideoScript> {
  const res = await client.patch(`/video-scripts/${scriptId}/settings`, data);
  return res.data;
}

// HeyGen
export async function generateHeygenVideoApi(scriptId: string): Promise<VideoScript> {
  const res = await client.post(`/video-scripts/${scriptId}/heygen`);
  return res.data;
}

export async function checkHeygenStatusApi(scriptId: string): Promise<VideoScript> {
  const res = await client.post(`/video-scripts/${scriptId}/heygen-status`);
  return res.data;
}

// WF4: preview background builder (Pexels with Japan-aware keyword mapping)
// bgSource: "free" (Pexels default) or "ai" (AI-generated via Kie.ai)
export async function buildVideoPreviewApi(
  scriptId: string,
  force: boolean = false,
  bgSource?: 'free' | 'ai'
): Promise<{ script: VideoScript; populatedCount: number; totalSections: number; bgSource?: string }> {
  const res = await client.post(`/video-scripts/${scriptId}/build-preview`, { force, bgSource });
  return res.data;
}

// Remotion
export async function generateRemotionVideoApi(scriptId: string): Promise<VideoScript> {
  const res = await client.post(`/video-scripts/${scriptId}/remotion`);
  return res.data;
}

export async function checkRemotionStatusApi(scriptId: string): Promise<VideoScript> {
  const res = await client.post(`/video-scripts/${scriptId}/remotion-status`);
  return res.data;
}

// Background search — returns multiple free image/video results to pick from
export interface BackgroundResult {
  url: string;
  thumbnail: string;
  source: 'pexels_photo' | 'pexels_video' | 'pixabay_video';
  width: number;
  height: number;
  duration?: number;
}

export async function searchSectionBackgroundsApi(
  sectionId: string,
  query?: string,
  searchType?: 'all' | 'photo' | 'video'
): Promise<{ results: BackgroundResult[]; query: string }> {
  const res = await client.post(`/video-scripts/sections/${sectionId}/search-backgrounds`, { query, searchType });
  return res.data;
}

export async function setSectionBackgroundApi(
  sectionId: string,
  imageUrl: string
): Promise<VideoScriptSection> {
  const res = await client.patch(`/video-scripts/sections/${sectionId}/set-background`, { imageUrl });
  return res.data;
}

// TTS Dictionary
export async function listTtsDictionary(): Promise<TtsDictionary[]> {
  const res = await client.get('/tts-dictionary');
  return res.data;
}

export async function addTtsDictionaryEntry(kanji: string, reading: string): Promise<TtsDictionary> {
  const res = await client.post('/tts-dictionary', { kanji, reading });
  return res.data;
}

export async function updateTtsDictionaryEntry(id: string, data: { kanji?: string; reading?: string }): Promise<TtsDictionary> {
  const res = await client.patch(`/tts-dictionary/${id}`, data);
  return res.data;
}

export async function deleteTtsDictionaryEntry(id: string): Promise<void> {
  await client.delete(`/tts-dictionary/${id}`);
}
