import axios from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export async function searchForFactCheck(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.VALUESERP_API_KEY;

  if (!apiKey) {
    console.log('[googleSearchService] VALUESERP_API_KEY not configured, returning empty');
    return [];
  }

  try {
    const response = await axios.get('https://api.valueserp.com/search', {
      params: { api_key: apiKey, q: query, location: 'Japan', google_domain: 'google.co.jp', gl: 'jp', hl: 'ja', num: 5 },
      timeout: 15000,
    });

    const results = response.data?.organic_results || [];
    if (results.length > 0) {
      console.log('[googleSearchService] First result keys:', Object.keys(results[0]));
    }
    return results
      .slice(0, 5)
      .map((r: { title?: string; link?: string; url?: string; snippet?: string }) => ({
        title: r.title || '',
        link: r.link || r.url || '',
        snippet: r.snippet || '',
      }))
      .filter((r: { link: string }) => r.link.startsWith('http'));
  } catch (err) {
    console.error('[googleSearchService] searchForFactCheck error:', err);
    return [];
  }
}
