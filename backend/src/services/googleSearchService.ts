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
    return results.slice(0, 5).map((r: { title?: string; link?: string; snippet?: string }) => ({
      title: r.title || '',
      link: r.link || '',
      snippet: r.snippet || '',
    }));
  } catch (err) {
    console.error('[googleSearchService] searchForFactCheck error:', err);
    return [];
  }
}
