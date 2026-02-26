import axios from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export async function searchForFactCheck(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    console.log('[googleSearchService] Google Search API not configured, returning empty');
    return [];
  }

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: apiKey, cx, q: query, num: 5 },
      timeout: 15000,
    });

    const items = response.data?.items || [];
    return items.map((item: { title: string; link: string; snippet: string }) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }));
  } catch (err) {
    console.error('[googleSearchService] searchForFactCheck error:', err);
    return [];
  }
}
