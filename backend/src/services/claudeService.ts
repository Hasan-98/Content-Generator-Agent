import OpenAI from 'openai';

const defaultClient = new OpenAI({ apiKey: process.env.OPEN_API });

function getClient(apiKey?: string): OpenAI {
  if (apiKey) return new OpenAI({ apiKey });
  return defaultClient;
}

async function chat(
  client: OpenAI,
  model: string,
  systemPrompt: string | null,
  userPrompt: string,
  maxTokens: number,
  temperature?: number
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
    ...(temperature !== undefined && { temperature }),
  });

  return completion.choices[0]?.message?.content ?? '';
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

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 2048);

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse OpenAI response as JSON array');

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

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 4096);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse OpenAI persona response');

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

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 512);
  return text.trim() || currentValue;
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
  const prompt = `You are an expert Japanese blog writer and SEO specialist. Your goal is to write a comprehensive, in-depth article that provides real value to readers.

Article context:
- Target keyword: ${result.keywordText}
- Title: ${result.title}
- Target demographic: ${result.demographic || 'General audience'}
- Primary persona: ${result.persona1 || ''}
${result.persona2 ? `- Secondary persona: ${result.persona2}` : ''}

Article structure guidance (expand on each section with depth and detail):
- Intro: ${result.structIntro || ''}
- Problem/悩み: ${result.structNayami || ''}
- Point 1: ${result.structP1 || ''}
- Point 2: ${result.structP2 || ''}
- Point 3: ${result.structP3 || ''}
- Common misconceptions: ${result.structCommon || ''}
- CTA: ${result.structCta || ''}
- Summary/まとめ: ${result.structMatome || ''}

Writing requirements:
1. Each section must be 500-800 characters (Japanese). This is critical — do NOT write shorter sections.
2. Include specific examples, data points, or actionable advice in every section.
3. For "point" sections, provide step-by-step explanations, real-world scenarios, or concrete tips.
4. For "nayami" section, deeply empathize with the reader's pain points and show you understand their situation.
5. For "common" section, address 2-3 specific misconceptions with clear corrections.
6. Use natural, conversational Japanese that feels helpful and trustworthy.
7. Naturally incorporate the target keyword and related terms for SEO.
8. Use paragraph breaks within each section for readability (use \\n\\n between paragraphs).

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

Write all content in Japanese. Remember: each section MUST be 500-800 characters minimum. Short sections are unacceptable.`;

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 16384);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse OpenAI article response');

  return JSON.parse(jsonMatch[0]) as ArticleSection[];
}

export async function verifyDemoSizeEstimate(
  keyword: string,
  demographic: string,
  persona: string,
  demoSize: string,
  searchResults: { title: string; link: string; snippet: string }[],
  apiKey?: string
): Promise<{ verdict: 'confirmed' | 'uncertain' | 'incorrect'; reason: string; populationEstimate?: string }> {
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
{ "verdict": "confirmed", "reason": "...", "populationEstimate": "約○○万人" }

verdict must be exactly one of: "confirmed", "uncertain", "incorrect"
reason must be a single sentence in Japanese explaining your assessment.
populationEstimate must be a concrete population count in Japanese (e.g. "約120万人", "推定80万〜100万人"). Based on the search results, provide your best estimate of the actual population size for this persona segment in Japan.`;

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 256);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { verdict: 'uncertain', reason: '検証結果の解析に失敗しました。' };

  try {
    return JSON.parse(jsonMatch[0]) as { verdict: 'confirmed' | 'uncertain' | 'incorrect'; reason: string; populationEstimate?: string };
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
  const systemPrompt = `You are an expert at writing image generation prompts for blog TITLE thumbnails (YouTube-style title cards).
Your output must be a single image generation prompt string only — no explanation, no preamble, no JSON.

The image MUST clearly display the exact Japanese title given by the user as bold, perfectly legible Japanese typography. Treat the title text as the main subject of the image — like a YouTube thumbnail or magazine cover.

Design rules (MUST follow):
- 16:9 wide landscape thumbnail
- Render the Japanese title text VERBATIM, prominently and centered, as crisp, large, bold Japanese typography (Noto Sans JP / gothic style)
- Title text must be perfectly legible — high contrast against the background, no garbled or fake characters, no extra words
- Use a tasteful background (gradient, subtle pattern, or soft conceptual imagery related to the topic) that does not compete with the title
- Strong color contrast, modern editorial / YouTube thumbnail aesthetic
- Optional small accent icon or shape relating to the topic, but keep the title as the dominant focal point
- High quality, sharp, professional`;

  const userPrompt = `Keyword: ${keyword}
Japanese title to render verbatim in the image: 「${title}」
Article summary (for background mood only): ${contentSummary}

Write an image generation prompt for this title thumbnail. The prompt MUST instruct the image model to render the exact Japanese title 「${title}」 as the main bold typography.`;

  return (await chat(getClient(apiKey), 'gpt-4o', systemPrompt, userPrompt, 1024)).trim();
}

export async function generateInfographicPrompt(
  keyword: string,
  title: string,
  sectionHeading: string,
  sectionContent: string,
  apiKey?: string
): Promise<string> {
  const systemPrompt = `You are an expert at creating image generation prompts for blog section illustrations.
Your output must be a single image generation prompt string only — no explanation, no preamble, no JSON.

Analysis steps (internal only, do not output):
1. Determine the key concept of this section
2. Choose a visual metaphor or scene that represents the concept
3. Pick a style: flat illustration, isometric, or clean photography

Design rules (MUST follow):
- 1:1 square aspect ratio
- Clean, professional illustration or conceptual photograph
- Clear visual hierarchy with a single focal point
- Soft, cohesive color palette with 2-3 accent colors
- Generous white space, not cluttered
- DO NOT include any text, words, letters, numbers, or typography
- DO NOT include charts, graphs, or data visualizations with labels
- Use visual metaphors, icons, objects, or scenes instead of text
- Style: modern, minimal, suitable for professional blog
- High quality, sharp details`;

  const userPrompt = `Keyword: ${keyword}
Article title: ${title}
Section heading: ${sectionHeading}
Section content: ${sectionContent}

Create an infographic image generation prompt for this section.`;

  return (await chat(getClient(apiKey), 'gpt-4o', systemPrompt, userPrompt, 1024)).trim();
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
  "title": "記事タイトル（70文字以内、SEOに最適化。記事本文と同じ言語で書くこと）",
  "body_html": "記事本文（HTML形式、h2/h3/p/ul/liタグを使用。titleはWordPressが自動表示するため、body_html内にh1タイトルを含めないこと）",
  "tags": "タグ（カンマ区切り、3-5個。記事本文と同じ言語で書くこと）",
  "excerpt": "記事の要約（160文字以内。記事本文と同じ言語で書くこと）"
}
\`\`\`

注意：JSONのみを出力し、他の説明は不要です。
また、JSON内の改行コードは必ず \\n に置き換え、1行の文字列として有効なJSON形式を維持してください。
キーワード: ${keyword}
元タイトル: ${articleTitle}`;

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 16384);

  let jsonStr = text;
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse OpenAI formatting response as JSON');

  return JSON.parse(jsonMatch[0]) as FormattedArticle;
}

export async function regenerateSection(
  section: { type: string; heading: string; content: string },
  articleTitle: string,
  instruction?: string,
  apiKey?: string
): Promise<string> {
  const prompt = `You are an expert Japanese blog writer and SEO specialist.

Article title: ${articleTitle}
Section type: ${section.type}
Section heading: ${section.heading}
Current content: ${section.content}
${instruction ? `Special instruction: ${instruction}` : ''}

Rewrite this section with fresh, improved, and more detailed content.
- Include specific examples, data points, or actionable advice.
- Use natural, conversational Japanese that feels helpful.
- Use paragraph breaks (\\n\\n) for readability.
- Target length: 500-800 characters.
Output ONLY the new content as plain text (no JSON, no quotes, no heading).
Write in Japanese.`;

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 4096);
  return text.trim() || section.content;
}

export interface VideoScriptResult {
  title: string;
  sections: {
    section: string;
    heading: string;
    points: string;
    type: string;
    narration: string;
    background_keyword: string;
    visual_type: string;
    visual_note: string;
  }[];
}

// Post-processing: enforce visual_type rules from the workflow
function enforceVisualTypeRules(sections: VideoScriptResult['sections']): void {
  if (sections.length !== 8) return;

  // Intro and outro must be avatar
  sections[0].visual_type = 'avatar';
  sections[7].visual_type = 'avatar';

  // Count non-speaker sections in middle (index 1-6)
  const noSpeakerIndices: number[] = [];
  for (let i = 1; i <= 6; i++) {
    if (sections[i].visual_type === 'scenery' || sections[i].visual_type === 'closeup') {
      noSpeakerIndices.push(i);
    }
  }

  // Max 2 non-speaker sections — convert extras to avatar
  if (noSpeakerIndices.length > 2) {
    const fixIndices = noSpeakerIndices.slice(2);
    for (const idx of fixIndices) {
      sections[idx].visual_type = 'avatar';
      sections[idx].visual_note = '自動修正: 回想シーン超過のためavatarに変更';
    }
  }

  // No consecutive scenery/closeup
  for (let i = 1; i < 7; i++) {
    const curr = sections[i].visual_type;
    const prev = sections[i - 1].visual_type;
    if (
      (curr === 'scenery' || curr === 'closeup') &&
      (prev === 'scenery' || prev === 'closeup')
    ) {
      sections[i].visual_type = 'avatar';
      sections[i].visual_note = '自動修正: 回想シーン連続のためavatarに変更';
    }
  }
}

export async function generateVideoScript(
  articleTitle: string,
  articleContent: string,
  apiKey?: string
): Promise<VideoScriptResult> {
  const systemPrompt = '動画スクリプト専門家。JSONのみ出力。話し手が主役の動画を作る。回想シーンは最小限に。';

  const userPrompt = `以下のブログ記事から、2分程度の解説動画用スクリプトを生成してください。

【ブログ記事タイトル】
${articleTitle}

【ブログ記事本文】
${articleContent}

JSON形式のみ出力。説明文不要。

\`\`\`json
{
  "title": "動画タイトル",
  "sections": [
    {
      "section": "イントロ",
      "heading": "見出し",
      "points": "ポイント1、ポイント2、ポイント3",
      "type": "general",
      "narration": "ナレーションテキスト",
      "background_keyword": "english keyword",
      "visual_type": "avatar",
      "visual_note": "演出メモ"
    }
  ]
}
\`\`\`

イントロ→セクション1〜6→アウトロ（8セクション）
narration: 通常の日本語（漢字あり）。約80-150文字。動画全体で約2分。
heading: 漢字OK。
points: 3キーポイント、カンマ区切り。
type: general/process/comparison
background_keyword: セクション内容に合った英語の背景画像検索キーワード。

visual_type:
- "avatar": 話し手がメイン。イントロ・アウトロ・解説時
- "scenery": 背景のみフルスクリーン。回想シーン専用
- "closeup": テキスト大きく表示。重要ポイント強調
- "split": 左に話し手、右にテキスト。解説・比較

★ visual_type配分ルール（絶対遵守）:
- 話し手が見える(avatar/split)は8セクション中6セクション以上（75%以上）
- 話し手が消える(scenery/closeup)は最大2セクションまで。回想シーンの位置づけ
- イントロ=avatar、アウトロ=avatar（固定）
- sceneryとcloseupは連続禁止
- おすすめ: avatar,avatar,scenery,avatar,split,closeup,avatar,avatar

visual_note: 演出意図を簡潔に。
トーン: 親しみやすく丁寧に。`;

  // Match n8n WF1 exactly: gpt-4.1-mini, temperature 0.3, maxTokens 4096
  const text = await chat(getClient(apiKey), 'gpt-4.1-mini', systemPrompt, userPrompt, 4096, 0.3);

  let jsonStr = text;
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) jsonStr = m[0];
  }

  const parsed = JSON.parse(jsonStr.trim()) as VideoScriptResult;
  if (!parsed.title || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid video script structure from AI');
  }

  // Ensure defaults for visual fields
  for (const s of parsed.sections) {
    s.visual_type = s.visual_type || 'avatar';
    s.visual_note = s.visual_note || '';
  }

  // Enforce visual_type rules
  enforceVisualTypeRules(parsed.sections);

  return parsed;
}

export async function regenerateTitle(
  keyword: string,
  currentTitle: string,
  demographic?: string | null,
  persona?: string | null,
  apiKey?: string
): Promise<string> {
  const prompt = `You are a Japanese SEO and content marketing expert.

Keyword: ${keyword}
Current title: ${currentTitle}
${demographic ? `Target demographic: ${demographic}` : ''}
${persona ? `Persona: ${persona}` : ''}

Generate a new, compelling blog title for this keyword that:
- Is different from the current title
- Drives clicks and curiosity
- Is SEO-optimized for the target keyword
- Appeals to the target audience
- Is written in Japanese

Output ONLY the new title as plain text (no JSON, no quotes, no explanation).`;

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 256);
  return text.trim() || currentTitle;
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

  const text = await chat(getClient(apiKey), 'gpt-4o', null, prompt, 256);
  return text.trim() || section.heading;
}
