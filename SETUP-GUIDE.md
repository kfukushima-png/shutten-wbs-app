# WBS管理システム セットアップ手順書

## 目次
1. [Firebaseプロジェクト作成](#1-firebaseプロジェクト作成)
2. [Firebase Authentication設定](#2-firebase-authentication設定)
3. [Firestore Database作成](#3-firestore-database作成)
4. [Webアプリ登録と環境変数設定](#4-webアプリ登録と環境変数設定)
5. [サービスアカウント（Admin SDK）設定](#5-サービスアカウントadmin-sdk設定)
6. [Firestoreセキュリティルール設定](#6-firestoreセキュリティルール設定)
7. [初回管理者ユーザー登録](#7-初回管理者ユーザー登録)
8. [ローカル開発サーバー起動](#8-ローカル開発サーバー起動)
9. [Vercelデプロイ](#9-vercelデプロイ)
10. [アカウント移行手順](#10-アカウント移行手順)

---

## 1. Firebaseプロジェクト作成

1. https://console.firebase.google.com/ にアクセス
2. **「プロジェクトを追加」** をクリック
3. プロジェクト名を入力（例: `wbs-management`）
4. Google Analyticsは **「このプロジェクトでGoogle Analyticsを有効にする」** → お好みで（不要なら無効でOK）
5. **「プロジェクトを作成」** をクリック

---

## 2. Firebase Authentication設定

1. Firebase Console左メニュー → **「Authentication」**
2. **「始める」** をクリック
3. **「ログイン方法」** タブ → **「Google」** を選択
4. **「有効にする」** をON
5. プロジェクトのサポートメール → 自分のメールアドレスを選択
6. **「保存」**

---

## 3. Firestore Database作成

1. Firebase Console左メニュー → **「Firestore Database」**
2. **「データベースを作成」**
3. ロケーション → **「asia-northeast1（東京）」** を選択（推奨）
4. セキュリティルール → **「テストモードで開始」** を選択（後で変更します）
5. **「作成」**

### Firestoreに必要なインデックス

以下のインデックスを作成してください：

**tasks コレクション:**
- フィールド: `storeId`（昇順）+ `deadline`（昇順）
- ※初回クエリ実行時にコンソールにエラーリンクが出るので、そこから自動作成も可能

**作成方法:**
1. Firestore → **「インデックス」** タブ
2. **「複合インデックス」** → **「インデックスを追加」**
3. コレクション: `tasks`
4. フィールド1: `storeId` - Ascending
5. フィールド2: `deadline` - Ascending
6. **「作成」**

---

## 4. Webアプリ登録と環境変数設定

1. Firebase Console → **プロジェクト設定**（歯車アイコン）
2. **「マイアプリ」** セクション → **「</>」**（Webアプリ追加）アイコン
3. アプリのニックネーム → `wbs-app`
4. **「Firebase Hostingも設定する」** はチェックなしでOK
5. **「アプリを登録」**
6. 表示される `firebaseConfig` の値をメモ

### `.env.local` ファイルを作成

プロジェクトルートに `.env.local` を作成し、以下を記入：

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...（コピーした値）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=wbs-management.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wbs-management
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=wbs-management.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 5. サービスアカウント（Admin SDK）設定

1. Firebase Console → **プロジェクト設定** → **「サービスアカウント」** タブ
2. **「新しい秘密鍵の生成」** をクリック
3. JSONファイルがダウンロードされる
4. JSONの中身から以下の値を `.env.local` に追記：

```
FIREBASE_ADMIN_PROJECT_ID=wbs-management
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@wbs-management.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...（JSONのprivate_keyの値をそのまま）\n-----END PRIVATE KEY-----\n"
```

**重要:** 秘密鍵のJSONファイルは安全な場所に保管し、Gitにコミットしないでください。

---

## 6. Firestoreセキュリティルール設定

Firestore → **「ルール」** タブで以下を設定：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 認証済みユーザーのみアクセス可能
    function isAuthenticated() {
      return request.auth != null;
    }

    // usersコレクションからロールを取得
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }

    function isPMOrAdmin() {
      return isAuthenticated() && getUserRole() in ['admin', 'pm'];
    }

    // Users: adminのみ作成・更新・削除可能、自分のドキュメントは読み取り可能
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Stores: PM以上が作成・更新可能、認証済みで読み取り可能
    match /stores/{storeId} {
      allow read: if isAuthenticated();
      allow create, update: if isPMOrAdmin();
      allow delete: if isAdmin();
    }

    // Task Templates: adminのみ作成・更新・削除可能
    match /taskTemplates/{templateId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Tasks: PM以上が作成・更新・削除可能、認証済みで読み取り可能
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isPMOrAdmin();
    }
  }
}
```

---

## 7. 初回管理者ユーザー登録

アプリに最初にログインする管理者ユーザーを手動でFirestoreに登録する必要があります。

### 方法A: Firebase Consoleから直接登録

1. まずアプリにアクセスし、Googleログインを実行
2. 「アクセス権限がありません」と表示されるが、Firebase AuthにはユーザーUIDが作成される
3. Firebase Console → **Authentication** → **Users** タブでログインしたユーザーのUIDをコピー
4. Firebase Console → **Firestore** → **「コレクションを開始」**
5. コレクション名: `users`
6. ドキュメントID: コピーしたUID
7. 以下のフィールドを追加:

| フィールド | 型 | 値 |
|-----------|------|------|
| email | string | あなたのメールアドレス |
| displayName | string | あなたの名前 |
| role | string | `admin` |
| storeIds | array | （空の配列） |
| createdAt | timestamp | 現在時刻 |

8. **「保存」** → アプリをリロードすると管理者としてログインできます

---

## 8. ローカル開発サーバー起動

```bash
cd wbs-app
npm install
npm run dev
```

http://localhost:3000 にアクセス

---

## 9. Vercelデプロイ

### 初回デプロイ

1. GitHubにリポジトリを作成してプッシュ

```bash
cd wbs-app
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/あなたのユーザー名/wbs-app.git
git push -u origin main
```

2. https://vercel.com にアクセスしてGitHubアカウントでログイン
3. **「Import Project」** → GitHubリポジトリを選択
4. **Environment Variables** に `.env.local` の全変数を追加
5. **「Deploy」**

### 以降のアップデート

```bash
git add .
git commit -m "変更内容の説明"
git push origin main
```

→ Vercelが自動でビルド＆デプロイします（プッシュするだけ）

---

## 10. アカウント移行手順

### Firebase（GCPプロジェクト）の移行

個人アカウントで作成したFirebaseプロジェクトを会社の管理者アカウントに移行できます。

**手順:**

1. Firebase Console → **プロジェクト設定** → **「ユーザーと権限」**
2. **「メンバーを追加」** → 会社の管理者メールアドレスを入力
3. ロール: **「オーナー」** を選択して招待
4. 会社の管理者が招待を承認
5. 会社の管理者がオーナーになったことを確認
6. 必要に応じて、個人アカウントの権限を **「編集者」** に変更

**これにより:**
- 会社アカウントがプロジェクトの所有者になる
- 個人アカウントは引き続き編集者として開発・デプロイが可能
- 請求先も会社アカウントに移行可能

### Vercelの移行

1. Vercel → **Team** を作成（会社名）
2. プロジェクトをTeamに移行: Settings → General → **「Transfer Project」**
3. 個人アカウントをTeamメンバーとして追加

### 移行後もあなたの個人アカウントからアップデート可能？

**はい、可能です。** 以下の2つの方法があります：

#### 方法1: GitHubリポジトリ経由（推奨）
- GitHubリポジトリに個人アカウントがコラボレーターとして残っていれば、`git push` するだけでVercelが自動デプロイ
- 会社のGitHubにリポジトリを移管した場合も、コラボレーター権限があればプッシュ可能

#### 方法2: Vercelのチームメンバー
- Vercel Teamのメンバーとして残っていれば、ダッシュボードから手動デプロイも可能

**まとめ:**
| 項目 | 移行後の個人アカウント |
|------|----------------------|
| Firebase（GCP） | 編集者として開発・設定変更可能 |
| Vercel | チームメンバーとしてデプロイ可能 |
| GitHub | コラボレーターとしてコード更新可能 |
| 本番データ（Firestore） | 権限があれば閲覧・編集可能 |

---

## CSV取込フォーマット

タスクをCSVで一括登録する場合のフォーマット：

```csv
タスク名,フェーズ,期限,期限設定,実行者,詳細,オーナー共有文章,共有資料URL,オーナー表示,公開区分
物件契約,契約前準備,2024-08-01,契約日から7日以内,PM田中,契約書の確認と押印,契約書のコピーをお渡しします,https://example.com/manual,true,safe
祝福の花の発注,オープン準備,2024-09-01,オープン3日前,PM田中,サプライズ用の花を発注,,,,secret
```

**公開区分の値:**
- `safe` = オーナーに見せて問題ない（公開OK）
- `caution` = 内容次第で注意が必要（要確認）
- `secret` = オーナーには絶対見せない（非公開）

**前提フェーズ:**
- 完了を待つフェーズ名を入力（例: `不動産契約`）
- 空欄なら依存関係なし

---

## 11. データの安全性とバックアップ

### アップデートしてもデータが消えない理由

```
コード（Next.js）→ Vercelにデプロイ → アップデートで上書きされる
データ（Firestore）→ Firebaseに保存  → アップデートに一切影響しない

コード = 画面の見た目・操作ロジック
データ = テンプレート、タスク、コメント、ユーザー情報

→ 完全に別の場所に保存されているので、コードを何度更新してもデータは消えません
```

### Firestoreの自動バックアップ設定（推奨）

万が一に備えて、毎日の自動バックアップを設定してください。

1. GCP Console → https://console.cloud.google.com/
2. プロジェクトを選択
3. **Cloud Storage** → バケットを作成（例: `wbs-backup-daily`）
4. **Cloud Scheduler** → ジョブを作成

```
名前: firestore-daily-backup
スケジュール: 0 3 * * * (毎日AM3時)
ターゲット: HTTP
URL: https://firestore.googleapis.com/v1/projects/[PROJECT_ID]/databases/(default):exportDocuments
メソッド: POST
本文: {"outputUriPrefix": "gs://wbs-backup-daily"}
認証: OAuthトークン (サービスアカウント)
```

または Firebase Console → Firestore → 「エクスポートとインポート」から手動バックアップも可能です。

---

## 12. 環境変数一覧

Vercelに設定するすべての環境変数：

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Client | ○ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client | ○ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Client | ○ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Client | ○ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Client | ○ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Client | ○ |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin | ○ |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin | ○ |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin | ○ |
| `SF_WEBHOOK_SECRET` | Salesforce連携 | △ |
| `SLACK_WEBHOOK_URL` | Slack通知 | △ |
| `CRON_SECRET` | 定期実行認証 | △ |
