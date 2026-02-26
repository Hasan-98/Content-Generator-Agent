import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratedPair {
  keyword: string;
  title: string;
}

export async function generateTitles(
  keyword: string,
  goal: string,
  audience: string,
  serpData: { title: string; snippet: string }[]
): Promise<GeneratedPair[]> {
  const serpContext = serpData
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`)
    .join('\n');

  const prompt = `You are an SEO and content marketing expert.

Generate 20 unique keyword + title pairs for a blog.

Search keyword: ${keyword}
Content goal: ${goal || 'Inform and educate readers'}
Target audience: ${audience || 'General audience'}
Search context (top results):
${serpContext || 'No search context available'}

Steps:
1. Extract unspoken pain points from search data
2. Select unique keywords aligned with the blog's identity
3. Create compelling titles that drive clicks

Output ONLY valid JSON array with exactly 20 objects:
[
  { "keyword": "...", "title": "..." },
  ...
]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse Claude response as JSON array');

  return JSON.parse(jsonMatch[0]) as GeneratedPair[];
}
