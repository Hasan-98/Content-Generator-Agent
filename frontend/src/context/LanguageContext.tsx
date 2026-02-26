import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'ja';

const en = {
  // App
  appTitle: 'Content Creator Studio — workspace',
  appLoading: 'Loading…',

  // Auth
  authSubtitle: 'Login to access your workspace',
  authEmail: 'Email',
  authPassword: 'Password',
  authPasswordPlaceholder: 'Enter password',
  authLoginBtn: 'Login',
  authLoggingIn: 'Logging in…',
  authErrorEmpty: 'Please enter your email and password',
  authErrorInvalid: 'Incorrect email or password',

  // Titlebar
  titlebarUserMgmt: 'User Management',
  titlebarAccountSettings: 'Account Settings',
  titlebarLogout: 'Logout',

  // Statusbar
  statusbarSynced: 'Synced',

  // Topic Creator
  topicLoading: 'Loading…',
  topicBreadcrumb: 'Topic Creator',
  topicAiFlowTitle: 'AI Keyword Generation Flow',
  topicStep1Title: 'Extracting worries',
  topicStep1Desc: 'Extracting "unverbalized worries" from search terms',
  topicStep2Title: 'Original KW selection',
  topicStep2Desc: "Select unique keywords that match your blog's identity",
  topicStep3Title: 'Title Generation',
  topicStep3Desc: 'Create compelling article titles that will attract clicks',
  topicSelectKeyword: 'Select a keyword from the left sidebar',
  topicSelectHint: 'Top Level → Expand Keyword → Edit Settings → Generate AI',
  topicNewProject: 'New Project',
  topicNewKeyword: 'New keyword',

  // Stats cards
  statsTotal: 'Total',
  statsKwDone: 'KW Done',
  statsPersonaDone: 'Persona Done',
  statsStructDone: 'Struct Done',

  // Flow Steps
  flowStep01: 'STEP 01',
  flowStep01Label: 'Keyword Generation',
  flowStep02: 'STEP 02',
  flowStep02Label: 'Persona & Structure',
  flowStep03: 'STEP 03',
  flowStep03Label: 'Fact Check',
  flowAll: 'ALL',
  flowAllLabel: 'Show All',

  // Toast messages
  toastTopicLoadFailed: 'Failed to load topics',
  toastTopicCreated: 'Topic created',
  toastTopicCreateFailed: 'Failed to create topic',
  toastRenameFailed: 'Failed to rename',
  toastTopicDeleteConfirm: 'Delete this topic?',
  toastTopicDeleted: 'Topic deleted',
  toastDeleteFailed: 'Failed to delete',
  toastKwAdded: 'Keyword added',
  toastKwAddFailed: 'Failed to add keyword',
  toastUpdateFailed: 'Failed to update',
  toastResultDeleted: 'Deleted',
  toastGenerateFailed: 'Failed to generate',
  toastPersonaGenerating: 'Generating persona & structure…',
  toastPersonaDone: 'Persona & structure generated',
  toastPersonaFailed: 'Persona generation failed',
  toastFactCheckRunning: 'Running fact check…',
  toastFactCheckDone: 'Fact check complete',
  toastFactCheckFailed: 'Fact check failed',
  toastSkipped: 'Skipped',
  toastRestored: 'Restored',
  toastSkipFailed: 'Failed to skip',
  toastRestoreFailed: 'Failed to restore',
  toastFieldRegenDone: 'Field regenerated',
  toastFieldRegenFailed: 'Failed to regenerate field',
  toastArticleGenerating: 'Generating article…',
  toastArticleDone: 'Article generated',
  toastArticleFailed: 'Article generation failed',
  toastSectionRegenDone: 'Section regenerated',
  toastImageGenDone: 'Image generated',
  toastImageGenFailed: 'Image generation failed',
  toastPublishDone: 'Published successfully',
  toastPublishFailed: 'Publish failed',

  // Topic Tree
  treeHeader: '📋 Topic Settings',
  treeCollapseAll: 'Collapse all',
  treeAddTop: 'Add top level',
  treeEdit: 'Edit',
  treeDelete: 'Delete',
  treeAddKeyword: 'Add Keywords...',

  // Keyword Card
  kwKeyword: 'Keyword',
  kwGoal: 'Content Goal',
  kwGoalPlaceholder: 'e.g. Help readers understand X and take action',
  kwAudience: 'Target Audience',
  kwGenerating: 'Generating...',
  kwGenerate: 'AI-powered keyword and title generation',
  kwViewResults: 'Showing results',

  // Results Table
  resultsEmpty: 'No keywords generated yet',
  resultsEmptyHint: 'Click "AI-powered keyword and title generation" in the sidebar',
  resultsSearch: 'search...',
  resultsAll: 'all',
  resultsColKeyword: 'Keyword',
  resultsColTitle: 'Title',
  resultsColStatus: 'Status',
  resultsColAction: 'Action',
  resultsColDemographic: 'Demographic',
  resultsColPersona1: 'Persona 1',
  resultsColPersona2: 'Persona 2',
  resultsColPersona3: 'Persona 3',
  resultsColDemoSize1: 'Demo Size 1',
  resultsColDemoSize2: 'Demo Size 2',
  resultsColDemoSize3: 'Demo Size 3',
  resultsColFactCheck: 'Fact Check',
  resultsColTargetDecision: 'Target Decision',
  resultsColStructIntro: 'Intro',
  resultsColStructNayami: 'Problem',
  resultsColStructP1: 'Point 1',
  resultsColStructP2: 'Point 2',
  resultsColStructP3: 'Point 3',
  resultsColStructCommon: 'Common',
  resultsColStructCta: 'CTA',
  resultsColStructMatome: 'Summary',
  resultsColStructH2: 'H2 Keys',
  resultsEdit: 'Edit',
  resultsDelete: 'Delete',

  // Gate buttons
  gatePending: 'Pending',
  gateNextStep: '▶ Next Step',
  gateSkipTitle: '✕ Skip this title',
  gateGenerating: '⏳ Generating…',
  gateFactCheck: '🔍 Run Fact Check',
  gateSkipDemoSize: '✕ Skip demo size',
  gateRunningFC: '⏳ Running FC…',
  gateDone: '✓ Done',
  gatePublished: '🌐 Published',
  gateRestore: '↩ Restore',

  // Status labels
  statusDraft: 'draft',
  statusReady: 'ready',
  statusKwDone: 'kw done',
  statusPersonaWip: 'persona…',
  statusPersonaDone: 'persona ok',
  statusStructWip: 'checking…',
  statusStructDone: 'struct ok',
  statusPublished: 'published',
  statusSkipped: 'skipped',
  // Keep old keys for backward compatibility
  statusProgress: 'in progress',
  statusDone: 'completion',

  // Detail Panel
  detailPanelAll: 'All',
  detailPanelPersona: 'Persona',
  detailPanelStructure: 'Structure',
  detailPanelComment: 'Comment',
  detailPersonaSection: 'Persona & Demographics',
  detailStructSection: 'Article Structure',
  detailFactCheckSection: 'Fact Check Results',
  detailGeneratePersonaBtn: '✨ Generate Persona & Structure',
  detailGeneratePersonaHint: 'No persona data yet. Click to generate.',
  detailSaveBtn: 'Save',
  detailCancelBtn: 'Cancel',
  detailRegenBtn: '🔄',
  detailCommentPlaceholder: 'Add a comment or instruction…',
  detailRegenWithComment: 'Regenerate with instruction',
  detailTargetField: 'Target field',

  // Bulk Actions
  bulkSelected: 'selected',
  bulkNextStep: 'Next Step',
  bulkChangeStatus: 'Change Status',
  bulkGeneratePersona: 'Generate Persona & Structure',
  bulkFactCheck: 'Run Fact Check',
  bulkDelete: 'Delete',

  // Article Creator
  articleCreatorBreadcrumb: 'Article Creator',
  articleStepA: 'STEP A',
  articleStepALabel: 'Write Article',
  articleStepB: 'STEP B',
  articleStepBLabel: 'Generate Images',
  articleStepC: 'STEP C',
  articleStepCLabel: 'Upload',
  articleSidebarHeader: 'Articles',
  articleNoItems: 'No STRUCT_DONE items yet',
  articleNoItemsHint: 'Complete STEP 03 in Topic Creator first',
  articleReferenceBtn: 'ペルソナ・構成を参照',
  articleGenerateBtn: '記事を生成する',
  articleGenerating: '記事を生成中…',
  articlePreviewBtn: 'プレビュー',
  articleNextToImages: '記事OK → 画像生成へ',
  articleBackToEdit: '← 記事に戻る',
  articleNextToUpload: '画像OK → アップロードへ',
  articleBackToImages: '← 画像に戻る',
  articlePublishBtn: '投稿する',
  articlePublished: '🎉 公開しました！',
  articlePublishedMsg: 'この記事は正常に公開されました',

  // Section Card
  sectionRegenBtn: 'このセクションを再生成',
  sectionRegenWithInstruction: '指示付き再生成',
  sectionInstructionPlaceholder: '再生成の指示を入力…',

  // Image Card
  imageTastePhoto: '📷 写実的',
  imageTasteTextOverlay: '🤍 文字入り',
  imageTasteInfographic: '📊 インフォグラフィック',
  imageTasteIllustration: '🎨 イラスト',
  imageTasteCinematic: '🎬 シネマティック',
  imageEnableBtn: '有効',
  imageDisableBtn: '無効',
  imageGenBtn: '画像を生成',
  imageRegenBtn: '再生成',
  imagePromptLabel: 'プロンプト',
  imagePromptReset: 'リセット',
  imageGenAll: '全画像を生成',
  imageGenAllBtn: '全ての有効な画像を生成する',

  // Upload Panel
  uploadTabPreview: 'プレビュー',
  uploadTabSeo: 'SEO・メタ情報',
  uploadTabPlatform: '投稿設定',
  uploadSlugLabel: 'スラッグ (URL)',
  uploadExcerptLabel: '抜粋',
  uploadExcerptChars: '文字',
  uploadTagsLabel: 'タグ',
  uploadCategoryLabel: 'カテゴリ',
  uploadPlatformWordPress: 'WordPress',
  uploadPlatformShopify: 'Shopify',
  uploadStatusPublish: '公開',
  uploadStatusDraft: '下書き',
  uploadStatusSchedule: '予約投稿',
  uploadScheduleDate: '公開予定日時',
  uploadChecklist: '公開前チェックリスト',
  uploadCheck1: '記事の校正が完了している',
  uploadCheck2: '画像がすべて生成されている',
  uploadCheck3: 'SEO情報が入力されている',
  uploadCheck4: 'プラットフォームが選択されている',
  uploadPublishBtn: '投稿する',
  uploadStatsSection: 'セクション数',
  uploadStatsChars: '総文字数',
  uploadStatsImagesGen: '生成済み画像',
  uploadStatsImagesEnabled: '有効な画像',

  // Reference Modal
  refModalTitle: 'ペルソナ・構成 参照',
  refTabPersona: 'ペルソナ',
  refTabStructure: '構成',
  refTabDemographics: 'デモグラ',
  refClose: '閉じる',

  // User Modal
  usersTitle: 'User Management',
  usersAddUser: 'Add User',
  usersName: 'Name',
  usersNamePlaceholder: 'John Smith',
  usersEmail: 'Email',
  usersPassword: 'Password',
  usersPasswordPlaceholder: '8+ characters',
  usersRole: 'Role',
  usersAdd: 'Add',
  usersLoading: 'Loading…',
  usersColUser: 'User',
  usersColRole: 'Role',
  usersColStatus: 'Status',
  usersColLastLogin: 'Last Login',
  usersYou: '(You)',
  usersActive: 'Active',
  usersInactive: 'Inactive',
  usersClickRole: 'Click to change role',
  usersDeactivate: 'Deactivate',
  usersActivate: 'Activate',
  usersDeleteBtn: 'Delete',

  // Role labels
  roleAdmin: 'Admin',
  roleEditor: 'Editor',
  roleViewer: 'Viewer',

  // User toast messages
  toastUsersLoadFailed: 'Failed to load users',
  toastUsersFillAll: 'Please fill in all fields',
  toastUsersCreateFailed: 'Failed to create user',
  toastUsersUpdateFailed: 'Failed to update',
  toastUsersRoleChangeFailed: 'Failed to change role',
  toastUsersDeleteFailed: 'Failed to delete',
} as const;

type TKey = keyof typeof en;

const ja: Record<TKey, string> = {
  // App
  appTitle: 'Content Creator Studio — workspace',
  appLoading: '読み込み中…',

  // Auth
  authSubtitle: 'ログインしてワークスペースにアクセス',
  authEmail: 'メールアドレス',
  authPassword: 'パスワード',
  authPasswordPlaceholder: 'パスワードを入力',
  authLoginBtn: 'ログイン',
  authLoggingIn: 'ログイン中…',
  authErrorEmpty: 'メールアドレスとパスワードを入力してください',
  authErrorInvalid: 'メールアドレスまたはパスワードが正しくありません',

  // Titlebar
  titlebarUserMgmt: 'ユーザー管理',
  titlebarAccountSettings: 'アカウント設定',
  titlebarLogout: 'ログアウト',

  // Statusbar
  statusbarSynced: '同期済',

  // Topic Creator
  topicLoading: '読み込み中…',
  topicBreadcrumb: 'トピッククリエーター',
  topicAiFlowTitle: 'AI キーワード生成フロー',
  topicStep1Title: '悩みの抽出',
  topicStep1Desc: '検索ワードから「言語化されていない悩み」を抽出',
  topicStep2Title: '独自KW選定',
  topicStep2Desc: 'ブログのアイデンティティに沿った独自キーワードを選定',
  topicStep3Title: 'タイトル生成',
  topicStep3Desc: 'クリックを誘発する魅力的な記事タイトルを作成',
  topicSelectKeyword: '左のサイドバーからキーワードを選択してください',
  topicSelectHint: 'Top レベル → キーワードを展開 → 設定を編集 → AI生成',
  topicNewProject: '新しいプロジェクト',
  topicNewKeyword: '新しいキーワード',

  // Stats cards
  statsTotal: '合計',
  statsKwDone: 'KW完了',
  statsPersonaDone: 'ペルソナ完了',
  statsStructDone: '構成完了',

  // Flow Steps
  flowStep01: 'STEP 01',
  flowStep01Label: 'キーワード生成',
  flowStep02: 'STEP 02',
  flowStep02Label: 'ペルソナ・構成',
  flowStep03: 'STEP 03',
  flowStep03Label: 'ファクトチェック',
  flowAll: 'ALL',
  flowAllLabel: 'すべて表示',

  // Toast messages
  toastTopicLoadFailed: 'トピックの読み込みに失敗しました',
  toastTopicCreated: 'トピックを作成しました',
  toastTopicCreateFailed: 'トピックの作成に失敗しました',
  toastRenameFailed: '名前の変更に失敗しました',
  toastTopicDeleteConfirm: 'このトピックを削除しますか？',
  toastTopicDeleted: 'トピックを削除しました',
  toastDeleteFailed: '削除に失敗しました',
  toastKwAdded: 'キーワードを追加しました',
  toastKwAddFailed: 'キーワードの追加に失敗しました',
  toastUpdateFailed: '更新に失敗しました',
  toastResultDeleted: '削除しました',
  toastGenerateFailed: '生成に失敗しました',
  toastPersonaGenerating: 'ペルソナ・構成を生成中…',
  toastPersonaDone: 'ペルソナ・構成を生成しました',
  toastPersonaFailed: 'ペルソナ生成に失敗しました',
  toastFactCheckRunning: 'ファクトチェック実行中…',
  toastFactCheckDone: 'ファクトチェック完了',
  toastFactCheckFailed: 'ファクトチェックに失敗しました',
  toastSkipped: 'スキップしました',
  toastRestored: '復元しました',
  toastSkipFailed: 'スキップに失敗しました',
  toastRestoreFailed: '復元に失敗しました',
  toastFieldRegenDone: 'フィールドを再生成しました',
  toastFieldRegenFailed: 'フィールドの再生成に失敗しました',
  toastArticleGenerating: '記事を生成中…',
  toastArticleDone: '記事を生成しました',
  toastArticleFailed: '記事生成に失敗しました',
  toastSectionRegenDone: 'セクションを再生成しました',
  toastImageGenDone: '画像を生成しました',
  toastImageGenFailed: '画像生成に失敗しました',
  toastPublishDone: '公開しました',
  toastPublishFailed: '公開に失敗しました',

  // Topic Tree
  treeHeader: '📋 トピック設定',
  treeCollapseAll: 'すべて折りたたむ',
  treeAddTop: 'トップを追加',
  treeEdit: '編集',
  treeDelete: '削除',
  treeAddKeyword: 'キーワードを追加...',

  // Keyword Card
  kwKeyword: 'キーワード',
  kwGoal: 'コンテンツのゴール',
  kwGoalPlaceholder: '例: 読者に○○を理解させ行動を促す',
  kwAudience: 'ターゲットオーディエンス',
  kwGenerating: '生成中...',
  kwGenerate: 'AI でキーワード＆タイトルを生成',
  kwViewResults: '結果を表示',

  // Results Table
  resultsEmpty: 'まだキーワードが生成されていません',
  resultsEmptyHint: 'サイドバーの「AI でキーワード＆タイトルを生成」をクリック',
  resultsSearch: '検索...',
  resultsAll: 'すべて',
  resultsColKeyword: 'キーワード',
  resultsColTitle: 'タイトル',
  resultsColStatus: 'ステータス',
  resultsColAction: 'アクション',
  resultsColDemographic: 'デモグラフィック',
  resultsColPersona1: 'ペルソナ1',
  resultsColPersona2: 'ペルソナ2',
  resultsColPersona3: 'ペルソナ3',
  resultsColDemoSize1: 'デモサイズ1',
  resultsColDemoSize2: 'デモサイズ2',
  resultsColDemoSize3: 'デモサイズ3',
  resultsColFactCheck: 'ファクトチェック',
  resultsColTargetDecision: 'ターゲット判定',
  resultsColStructIntro: 'イントロ',
  resultsColStructNayami: '悩み',
  resultsColStructP1: 'ポイント1',
  resultsColStructP2: 'ポイント2',
  resultsColStructP3: 'ポイント3',
  resultsColStructCommon: 'よくある誤解',
  resultsColStructCta: 'CTA',
  resultsColStructMatome: 'まとめ',
  resultsColStructH2: 'H2キーワード',
  resultsEdit: '編集',
  resultsDelete: '削除',

  // Gate buttons
  gatePending: '生成待ち',
  gateNextStep: '▶ 次に進む',
  gateSkipTitle: '✕ このタイトルはNG',
  gateGenerating: '⏳ AI生成中…',
  gateFactCheck: '🔍 ファクトチェックする',
  gateSkipDemoSize: '✕ この想定人数は不要',
  gateRunningFC: '⏳ FC実行中…',
  gateDone: '✓ 完了',
  gatePublished: '🌐 公開済',
  gateRestore: '↩ 前に戻す',

  // Status labels
  statusDraft: '下書き',
  statusReady: '準備完了',
  statusKwDone: 'KW完了',
  statusPersonaWip: 'ペルソナ生成中',
  statusPersonaDone: 'ペルソナ完了',
  statusStructWip: 'FC実行中',
  statusStructDone: '構成完了',
  statusPublished: '公開済',
  statusSkipped: 'スキップ',
  // Keep old keys for backward compatibility
  statusProgress: '進行中',
  statusDone: '完了',

  // Detail Panel
  detailPanelAll: 'すべて',
  detailPanelPersona: 'ペルソナ',
  detailPanelStructure: '構成',
  detailPanelComment: 'コメント',
  detailPersonaSection: 'ペルソナ・デモグラフィック',
  detailStructSection: '記事構成',
  detailFactCheckSection: 'ファクトチェック結果',
  detailGeneratePersonaBtn: '✨ ペルソナ・構成を生成する',
  detailGeneratePersonaHint: 'ペルソナデータがありません。クリックして生成してください。',
  detailSaveBtn: '保存',
  detailCancelBtn: 'キャンセル',
  detailRegenBtn: '🔄',
  detailCommentPlaceholder: 'コメントや指示を追加…',
  detailRegenWithComment: '指示付きで再生成',
  detailTargetField: 'ターゲットフィールド',

  // Bulk Actions
  bulkSelected: '件選択中',
  bulkNextStep: '次のステップへ進む',
  bulkChangeStatus: 'ステータス変更',
  bulkGeneratePersona: 'ペルソナ・構成一括生成',
  bulkFactCheck: 'ファクトチェック一括実行',
  bulkDelete: '一括削除',

  // Article Creator
  articleCreatorBreadcrumb: '記事クリエーター',
  articleStepA: 'STEP A',
  articleStepALabel: '記事作成',
  articleStepB: 'STEP B',
  articleStepBLabel: '画像生成',
  articleStepC: 'STEP C',
  articleStepCLabel: 'アップロード',
  articleSidebarHeader: '記事一覧',
  articleNoItems: 'STRUCT_DONEのアイテムがありません',
  articleNoItemsHint: 'トピッククリエーターでSTEP 03を完了してください',
  articleReferenceBtn: 'ペルソナ・構成を参照',
  articleGenerateBtn: '記事を生成する',
  articleGenerating: '記事を生成中…',
  articlePreviewBtn: 'プレビュー',
  articleNextToImages: '記事OK → 画像生成へ',
  articleBackToEdit: '← 記事に戻る',
  articleNextToUpload: '画像OK → アップロードへ',
  articleBackToImages: '← 画像に戻る',
  articlePublishBtn: '投稿する',
  articlePublished: '🎉 公開しました！',
  articlePublishedMsg: 'この記事は正常に公開されました',

  // Section Card
  sectionRegenBtn: 'このセクションを再生成',
  sectionRegenWithInstruction: '指示付き再生成',
  sectionInstructionPlaceholder: '再生成の指示を入力…',

  // Image Card
  imageTastePhoto: '📷 写実的',
  imageTasteTextOverlay: '🤍 文字入り',
  imageTasteInfographic: '📊 インフォグラフィック',
  imageTasteIllustration: '🎨 イラスト',
  imageTasteCinematic: '🎬 シネマティック',
  imageEnableBtn: '有効',
  imageDisableBtn: '無効',
  imageGenBtn: '画像を生成',
  imageRegenBtn: '再生成',
  imagePromptLabel: 'プロンプト',
  imagePromptReset: 'リセット',
  imageGenAll: '全画像を生成',
  imageGenAllBtn: '全ての有効な画像を生成する',

  // Upload Panel
  uploadTabPreview: 'プレビュー',
  uploadTabSeo: 'SEO・メタ情報',
  uploadTabPlatform: '投稿設定',
  uploadSlugLabel: 'スラッグ (URL)',
  uploadExcerptLabel: '抜粋',
  uploadExcerptChars: '文字',
  uploadTagsLabel: 'タグ',
  uploadCategoryLabel: 'カテゴリ',
  uploadPlatformWordPress: 'WordPress',
  uploadPlatformShopify: 'Shopify',
  uploadStatusPublish: '公開',
  uploadStatusDraft: '下書き',
  uploadStatusSchedule: '予約投稿',
  uploadScheduleDate: '公開予定日時',
  uploadChecklist: '公開前チェックリスト',
  uploadCheck1: '記事の校正が完了している',
  uploadCheck2: '画像がすべて生成されている',
  uploadCheck3: 'SEO情報が入力されている',
  uploadCheck4: 'プラットフォームが選択されている',
  uploadPublishBtn: '投稿する',
  uploadStatsSection: 'セクション数',
  uploadStatsChars: '総文字数',
  uploadStatsImagesGen: '生成済み画像',
  uploadStatsImagesEnabled: '有効な画像',

  // Reference Modal
  refModalTitle: 'ペルソナ・構成 参照',
  refTabPersona: 'ペルソナ',
  refTabStructure: '構成',
  refTabDemographics: 'デモグラ',
  refClose: '閉じる',

  // User Modal
  usersTitle: 'ユーザー管理',
  usersAddUser: 'ユーザーを追加',
  usersName: '名前',
  usersNamePlaceholder: '山田 太郎',
  usersEmail: 'メールアドレス',
  usersPassword: 'パスワード',
  usersPasswordPlaceholder: '8文字以上',
  usersRole: '権限',
  usersAdd: '追加',
  usersLoading: '読み込み中…',
  usersColUser: 'ユーザー',
  usersColRole: '権限',
  usersColStatus: 'ステータス',
  usersColLastLogin: '最終ログイン',
  usersYou: '(自分)',
  usersActive: '有効',
  usersInactive: '無効',
  usersClickRole: 'クリックで権限を変更',
  usersDeactivate: '無効化',
  usersActivate: '有効化',
  usersDeleteBtn: '削除',

  // Role labels
  roleAdmin: '管理者',
  roleEditor: '編集者',
  roleViewer: '閲覧者',

  // User toast messages
  toastUsersLoadFailed: 'ユーザーの読み込みに失敗しました',
  toastUsersFillAll: 'すべてのフィールドを入力してください',
  toastUsersCreateFailed: 'ユーザーの作成に失敗しました',
  toastUsersUpdateFailed: '更新に失敗しました',
  toastUsersRoleChangeFailed: '権限の変更に失敗しました',
  toastUsersDeleteFailed: '削除に失敗しました',
};

const translations: Record<Lang, Record<TKey, string>> = { en, ja };

interface LanguageContextValue {
  lang: Lang;
  toggle: () => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ja');

  function toggle() {
    setLang((l) => (l === 'en' ? 'ja' : 'en'));
  }

  function t(key: TKey): string {
    return translations[lang][key];
  }

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
