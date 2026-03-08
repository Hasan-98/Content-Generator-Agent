import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratedPair {
  keyword: string;
  title: string;
}

export interface PersonaStructureResult {
  demographic: string;
  persona1: string;
  persona2: string;
  persona3: string;
  demoSize1: string;
  demoSize2: string;
  demoSize3: string;
  structIntro: string;
  structNayami: string;
  structP1: string;
  structP2: string;
  structP3: string;
  structCommon: string;
  structCta: string;
  structMatome: string;
  structH2: string;
}

export interface ArticleSection {
  type: string;
  heading: string;
  content: string;
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

Generate 10 unique keyword + title pairs for a blog.

Search keyword: ${keyword}
Content goal: ${goal || 'Inform and educate readers'}
Target audience: ${audience || 'General audience'}
Search context (top results):
${serpContext || 'No search context available'}

Steps:
1. Extract unspoken pain points from search data
2. Select unique keywords aligned with the blog's identity
3. Create compelling titles that drive clicks

Output ONLY valid JSON array with exactly 10 objects:
[
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." }
]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse Claude response as JSON array');

  return JSON.parse(jsonMatch[0]) as GeneratedPair[];
}

export async function generatePersonaAndStructure(
  keyword: string,
  goal: string,
  audience: string,
  title: string
): Promise<PersonaStructureResult> {
  const prompt = `You are a Japanese SEO content strategist and audience research expert.

Analyze the following blog article and generate detailed persona and article structure data.

Keyword: ${keyword}
Title: ${title}
Content goal: ${goal || 'Inform and educate readers'}
Target audience: ${audience || 'General audience'}

Generate:
1. A demographic overview of the target reader
2. Three specific reader personas (persona1, persona2, persona3) - describe each as a specific person with situation, pain point, and motivation (1-2 sentences each, in Japanese)
3. Estimated demographic sizes for each persona (demoSize1, demoSize2, demoSize3) - describe size/proportion of this segment
4. Article structure sections:
   - structIntro: Introduction hook and problem statement (1-2 sentences)
   - structNayami: Reader's pain/problem deep dive
   - structP1, structP2, structP3: Three main content points/solutions
   - structCommon: Common misconceptions or things readers misunderstand
   - structCta: Call to action section description
   - structMatome: Summary/conclusion description
   - structH2: Suggested H2 heading keywords list

Output ONLY valid JSON:
{
  "demographic": "...",
  "persona1": "...",
  "persona2": "...",
  "persona3": "...",
  "demoSize1": "...",
  "demoSize2": "...",
  "demoSize3": "...",
  "structIntro": "...",
  "structNayami": "...",
  "structP1": "...",
  "structP2": "...",
  "structP3": "...",
  "structCommon": "...",
  "structCta": "...",
  "structMatome": "...",
  "structH2": "..."
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse Claude persona response');

  return JSON.parse(jsonMatch[0]) as PersonaStructureResult;
}

export async function regenerateField(
  keyword: string,
  title: string,
  fieldKey: string,
  currentValue: string,
  instruction?: string
): Promise<string> {
  const prompt = `You are a Japanese SEO content strategist.

Context:
- Keyword: ${keyword}
- Title: ${title}
- Field to regenerate: ${fieldKey}
- Current value: ${currentValue}
${instruction ? `- Special instruction: ${instruction}` : ''}

Regenerate only the "${fieldKey}" field with a fresh, improved version.
Output ONLY the new value as plain text (no JSON wrapper, no quotes).`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : currentValue;
}

export async function generateArticle(result: {
  keywordText: string;
  title: string;
  demographic?: string | null;
  persona1?: string | null;
  persona2?: string | null;
  persona3?: string | null;
  structIntro?: string | null;
  structNayami?: string | null;
  structP1?: string | null;
  structP2?: string | null;
  structP3?: string | null;
  structCommon?: string | null;
  structCta?: string | null;
  structMatome?: string | null;
  structH2?: string | null;
}): Promise<ArticleSection[]> {
  const prompt = `You are a professional Japanese blog writer.

Write a full blog article based on:
- Keyword: ${result.keywordText}
- Title: ${result.title}
- Target demographic: ${result.demographic || 'General audience'}
- Persona: ${result.persona1 || ''}

Article structure guidance:
- Intro: ${result.structIntro || ''}
- Problem: ${result.structNayami || ''}
- Point 1: ${result.structP1 || ''}
- Point 2: ${result.structP2 || ''}
- Point 3: ${result.structP3 || ''}
- Common misconceptions: ${result.structCommon || ''}
- CTA: ${result.structCta || ''}
- Summary: ${result.structMatome || ''}

Generate exactly 8 article sections. Each section has a type, heading, and content.
Types: intro, nayami, point, common, cta, matome (use these exactly)

Output ONLY valid JSON array with exactly 8 objects:
[
  { "type": "intro", "heading": "...", "content": "..." },
  { "type": "nayami", "heading": "...", "content": "..." },
  { "type": "point", "heading": "...", "content": "..." },
  { "type": "point", "heading": "...", "content": "..." },
  { "type": "point", "heading": "...", "content": "..." },
  { "type": "common", "heading": "...", "content": "..." },
  { "type": "cta", "heading": "...", "content": "..." },
  { "type": "matome", "heading": "...", "content": "..." }
]

Write all content in Japanese. Each content section should be 150-300 characters.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse Claude article response');

  return JSON.parse(jsonMatch[0]) as ArticleSection[];
}

export async function regenerateSection(
  section: { type: string; heading: string; content: string },
  articleTitle: string,
  instruction?: string
): Promise<string> {
  const prompt = `You are a professional Japanese blog writer.

Article title: ${articleTitle}
Section type: ${section.type}
Section heading: ${section.heading}
Current content: ${section.content}
${instruction ? `Special instruction: ${instruction}` : ''}

Rewrite this section with fresh, improved content.
Output ONLY the new content as plain text (no JSON, no quotes, no heading).
Write in Japanese. 150-300 characters.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : section.content;
}
