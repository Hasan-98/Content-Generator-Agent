import { createContext, useContext, useState, ReactNode } from 'react';

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
  resultsEdit: 'Edit',
  resultsDelete: 'Delete',

  // Status labels
  statusDraft: 'draft',
  statusReady: 'Ready',
  statusProgress: 'in progress',
  statusDone: 'completion',
  statusPublished: 'published',

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
  resultsEdit: '編集',
  resultsDelete: '削除',

  // Status labels
  statusDraft: '下書き',
  statusReady: '準備完了',
  statusProgress: '進行中',
  statusDone: '完了',
  statusPublished: '公開済',

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
