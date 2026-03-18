import Anthropic from '@anthropic-ai/sdk';

const defaultClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getClient(apiKey?: string): Anthropic {
  if (apiKey) return new Anthropic({ apiKey });
  return defaultClient;
}

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
  serpData: { title: string; snippet: string }[],
  apiKey?: string
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

  const message = await getClient(apiKey).messages.create({
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
  title: string,
  apiKey?: string
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
3. Estimated demographic sizes for each persona (demoSize1, demoSize2, demoSize3) - provide a concrete estimated population count in Japan (e.g. "日本国内に約120万人", "推定80万〜100万人"). Use real research-based numbers, not vague percentages.
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

  const message = await getClient(apiKey).messages.create({
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
  instruction?: string,
  apiKey?: string
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

  const message = await getClient(apiKey).messages.create({
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
},
  apiKey?: string
): Promise<ArticleSection[]> {
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

  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse Claude article response');

  return JSON.parse(jsonMatch[0]) as ArticleSection[];
}

export async function verifyDemoSizeEstimate(
  keyword: string,
  demographic: string,
  persona: string,
  demoSize: string,
  searchResults: { title: string; link: string; snippet: string }[],
  apiKey?: string
): Promise<{ verdict: 'confirmed' | 'uncertain' | 'incorrect'; reason: string }> {
  if (searchResults.length === 0) {
    return { verdict: 'uncertain', reason: '検索結果がありませんでした。' };
  }

  const resultsText = searchResults
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`)
    .join('\n');

  const prompt = `You are a demographic research expert for the Japanese market.

A blog article targets this keyword: ${keyword}
Demographic group: ${demographic}
Persona description: ${persona}
Estimated population size for this persona: ${demoSize}

Based on the following web search results, assess whether this population size estimate is reasonable for Japan.

Search results:
${resultsText}

Reply ONLY with valid JSON (no extra text):
{ "verdict": "confirmed", "reason": "..." }

verdict must be exactly one of: "confirmed", "uncertain", "incorrect"
reason must be a single sentence in Japanese explaining your assessment.`;

  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { verdict: 'uncertain', reason: '検証結果の解析に失敗しました。' };

  try {
    return JSON.parse(jsonMatch[0]) as { verdict: 'confirmed' | 'uncertain' | 'incorrect'; reason: string };
  } catch {
    return { verdict: 'uncertain', reason: '検証結果の解析に失敗しました。' };
  }
}

export async function generateTitleImagePrompt(
  keyword: string,
  title: string,
  contentSummary: string,
  apiKey?: string
): Promise<string> {
  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are an expert at creating image generation prompts for Japanese blog title thumbnails (YouTube thumbnail style).
Your output must be a single image generation prompt string only — no explanation, no preamble, no JSON.

Design rules:
- Main text: condensed Japanese phrase from the title (max 3 lines), placed center-large
- Sub text: supporting info in side bands (top/right/left corners)
- Background: dark grey or near-black, moody professional feel
- Main text color: #FFFFFF, accent/highlight: #FFFF00
- Font style: ultra-bold, minimal serifs, high readability
- Layout: central headline, supplementary info distributed around edges
- Decorations: capsule strips, dotted separators, simple shapes, person photo lower-right
- Style: catchy informative catalog, YouTube thumbnail, modern Japanese blog
- Aspect ratio: 16:9`,
    messages: [
      {
        role: 'user',
        content: `Keyword: ${keyword}
Title: ${title}
Article summary: ${contentSummary}

Create an image generation prompt for the title thumbnail.`,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

export async function generateInfographicPrompt(
  keyword: string,
  title: string,
  sectionHeading: string,
  sectionContent: string,
  apiKey?: string
): Promise<string> {
  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are an expert at creating image generation prompts for Japanese blog infographic illustrations.
Your output must be a single image generation prompt string only — no explanation, no preamble, no JSON.

Analysis steps (internal only, do not output):
1. Determine content type: comparison (A vs B → split layout) / process (steps → flowchart) / general (icons + sections)
2. Choose style: Flat design OR Isometric OR Minimalist
3. Choose data element: Flowchart OR Charts OR Icons OR Timeline
4. Choose 2 accent colors (hex)
5. Extract 3-5 key points as short Japanese labels

Design rules (MUST follow):
- ALL TEXT IN JAPANESE — no English text
- White background
- 1:1 square aspect ratio
- High contrast, generous white space, clear visual hierarchy
- NO photo-realistic — only vector/flat/isometric style
- NOT messy or overcrowded
- Professional blog illustration
- Article title as heading at top
- Japanese text labels for each key point`,
    messages: [
      {
        role: 'user',
        content: `Keyword: ${keyword}
Article title: ${title}
Section heading: ${sectionHeading}
Section content: ${sectionContent}

Create an infographic image generation prompt for this section.`,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

export interface FormattedArticle {
  title: string;
  body_html: string;
  tags: string;
  excerpt: string;
}

export async function formatArticleForPublish(
  articleTitle: string,
  keyword: string,
  sections: { type: string; heading: string; content: string }[],
  images: { index: number; imageUrl: string | null; enabled: boolean }[],
  apiKey?: string
): Promise<FormattedArticle> {
  const enabledImages = images.filter(i => i.enabled && i.imageUrl);
  const imageList = enabledImages
    .map(i => `画像${i.index}: ${i.imageUrl}`)
    .join('\n');

  const articleBody = sections
    .map(s => `【${s.heading}】\n${s.content}`)
    .join('\n\n');

  // Build image placement instructions based on section types
  const sectionMap = sections.map((s, i) => `${i}: ${s.type} — ${s.heading}`).join('\n');

  const prompt = `あなたは経験豊富なWebライター兼編集者です。

提供された「記事本文」を、ほぼ文章を変更せずに
WordPressに適応したフォーマットに整形してください。

その際、提供された画像を記事内の最も効果的な位置に挿入してください。

### 画像の配置ルール
以下の指示に従って <img> タグを挿入してください。
- 画像0（タイトル用）: 記事の冒頭（最初の見出しの前）に配置。
- 画像1〜: 各セクションの内容に最も関連するセクションの前に配置。
- 画像の配置は記事の読みやすさと視覚的な流れを考慮して最適化すること。

### セクション構成
${sectionMap}

### 整形ルール
- 大見出しは <h2>、小見出しは <h3> を使用してください。
- 本文は <p> タグで囲み、重要な文章は <strong> で強調してください。
- 画像タグは以下をベースに、alt属性には前のブロックの内容を簡潔に記述してください。
  <img src="URL" alt="画像の説明" style="width:100%; height:auto; margin-bottom:20px;">
- 箇条書きがあれば <ul><li> を使用してください。
- 改行は \\n に置換して

---
### 入力データ
「記事本文」
${articleBody}

「画像URLリスト」
${imageList || '画像なし'}
---

### 出力
以下のJSON形式で出力してください：
\`\`\`json
{
  "title": "記事タイトル（70文字以内、SEOに最適化）",
  "body_html": "記事本文（HTML形式、h2/h3/p/ul/liタグを使用）",
  "tags": "タグ（カンマ区切り、3-5個）",
  "excerpt": "記事の要約（160文字以内）"
}
\`\`\`

注意：JSONのみを出力し、他の説明は不要です。
また、JSON内の改行コードは必ず \\n に置き換え、1行の文字列として有効なJSON形式を維持してください。
キーワード: ${keyword}
元タイトル: ${articleTitle}`;

  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Strip markdown code fences if present
  let jsonStr = text;
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse Claude formatting response as JSON');

  return JSON.parse(jsonMatch[0]) as FormattedArticle;
}

export async function regenerateSection(
  section: { type: string; heading: string; content: string },
  articleTitle: string,
  instruction?: string,
  apiKey?: string
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

  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : section.content;
}

export async function regenerateSectionHeading(
  section: { type: string; heading: string; content: string },
  articleTitle: string,
  apiKey?: string
): Promise<string> {
  const prompt = `You are a professional Japanese blog writer and SEO expert.

Article title: ${articleTitle}
Section type: ${section.type}
Current heading: ${section.heading}
Section content summary: ${section.content.slice(0, 200)}

Generate a new, compelling heading for this section that:
- Matches the section content
- Is engaging and SEO-friendly
- Is written in Japanese

Output ONLY the new heading as plain text (no JSON, no quotes, no explanation).`;

  const message = await getClient(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : section.heading;
}
