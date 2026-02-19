import axios from 'axios';

export interface SerpResult {
  title: string;
  snippet: string;
}

export async function searchKeyword(keyword: string): Promise<SerpResult[]> {
  const apiKey = process.env.VALUESERP_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.get('https://api.valueserp.com/search', {
      params: { api_key: apiKey, q: keyword, num: 10 },
      timeout: 10000,
    });

    const results = response.data?.organic_results || [];
    return results.slice(0, 10).map((r: { title?: string; snippet?: string }) => ({
      title: r.title || '',
      snippet: r.snippet || '',
    }));
  } catch (err) {
    console.error('SERP API error:', err);
    return [];
  }
}
