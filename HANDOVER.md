# WBS管理システム 引継書

## プロジェクト概要

フランチャイズ出店のWBS（Work Breakdown Structure）をPCとスマホで管理するWebアプリ。
ブランドごとにテンプレートタスクを用意し、新規出店時にテンプレートから店舗タスクを自動生成する。

- **本番URL**: https://shutten-wbs-app.vercel.app
- **リポジトリ**: https://github.com/kfukushima-png/shutten-wbs-app (public)
- **技術スタック**: Next.js 16 + TypeScript + Tailwind CSS + Firebase (Auth/Firestore) + Vercel

---

## 技術構成

```
フロントエンド: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
認証: Firebase Auth (Google OAuth)
DB: Cloud Firestore
ホスティング: Vercel (Hobbyプラン)
ガントチャート: frappe-gantt
CSV処理: papaparse
日付処理: date-fns
```

---

## ディレクトリ構成

```
wbs-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # ルートレイアウト（AuthProvider, ファビコン）
│   │   ├── login/page.tsx              # ログイン画面（Google認証 + 承認待ち表示）
│   │   ├── icon.svg                    # ファビコン
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # ダッシュボードレイアウト（サイドバー + 認証ガード）
│   │   │   ├── page.tsx                # ダッシュボード（全ロール共通、フィルター、1週間サマリー）
│   │   │   ├── stores/
│   │   │   │   ├── page.tsx            # 店舗管理（新規作成 + 削除確認モーダル）
│   │   │   │   └── [storeId]/page.tsx  # 店舗詳細（テーブル/ガント/ガント選択の3モード）
│   │   │   └── settings/
│   │   │       ├── brands/page.tsx     # ブランド管理
│   │   │       ├── templates/page.tsx  # テンプレート管理（CSV一括取込対応）
│   │   │       ├── users/page.tsx      # ユーザー管理（承認/事前登録/店舗割当）
│   │   │       └── integrations/page.tsx # 外部連携ガイド（Slack/カレンダー/SF）
│   │   └── api/
│   │       ├── salesforce/webhook/route.ts  # SF→WBS Webhook受信
│   │       ├── cron/daily-reminder/route.ts # 毎朝Slack通知（Vercel Cron）
│   │       └── report/[storeId]/route.ts    # 出店レポートCSV/JSON生成
│   ├── components/
│   │   ├── sidebar.tsx              # サイドバー（sticky固定 + 折りたたみ）
│   │   ├── mobile-nav.tsx           # スマホ用ハンバーガーメニュー
│   │   ├── task-table.tsx           # タスクテーブル（展開式詳細 + フェーズ色分け）
│   │   ├── add-task-modal.tsx       # タスク追加モーダル
│   │   ├── edit-task-modal.tsx      # タスク編集モーダル
│   │   ├── csv-upload.tsx           # CSV取込（重複チェック + ガイド表示）
│   │   ├── gantt-chart.tsx          # ガントチャート（理想vs実際の重ね表示）
│   │   ├── calendar-button.tsx      # Googleカレンダー登録ボタン
│   │   ├── report-button.tsx        # レポート出力ボタン
│   │   ├── store-edit-modal.tsx     # 店舗情報編集モーダル（名前/オーナー/基準日）
│   │   ├── task-comments.tsx        # タスクコメント機能
│   │   ├── visibility-toggle.tsx    # オーナー表示切替（アラート付き）
│   │   ├── delete-confirm-modal.tsx # 削除確認モーダル（名前入力必須）
│   │   └── status-badge.tsx         # ステータスバッジ
│   ├── lib/
│   │   ├── firebase.ts              # Firebase Client SDK（遅延初期化）
│   │   ├── firebase-admin.ts        # Firebase Admin SDK（サーバーサイド）
│   │   ├── firestore.ts             # Firestore CRUD全関数
│   │   ├── auth-context.tsx          # 認証コンテキスト（事前登録自動承認対応）
│   │   ├── google-calendar.ts       # Google Calendar API
│   │   ├── slack.ts                 # Slack Webhook通知
│   │   └── sf-phase-mapping.ts      # Salesforceフェーズマッピング
│   └── types/
│       ├── index.ts                 # 全型定義（Store/Task/Template/Brand/User等）
│       └── frappe-gantt.d.ts        # frappe-gantt型定義
├── SETUP-GUIDE.md                   # Firebase/Vercelセットアップ手順書
├── SALESFORCE-SETUP.md              # Salesforce連携設定手順書
├── vercel.json                      # Vercel Cron設定
├── .env.local.example               # 環境変数テンプレート
└── .gitignore
```

---

## ロール（権限）

| ロール | できること |
|--------|-----------|
| **admin** | 全操作。ブランド/テンプレート/ユーザー管理。ロール変更。 |
| **pm（本部PM）** | 店舗管理、タスク編集、CSV取込、レポート、カレンダー、ユーザー承認 |
| **owner（オーナー）** | 自店舗の公開タスク閲覧、コメント投稿のみ |

---

## データモデル（Firestoreコレクション）

### users
```
uid (ドキュメントID = Firebase Auth UID)
├── email: string
├── displayName: string（Googleアカウントの姓名）
├── photoURL: string
├── role: "admin" | "pm" | "owner"
├── status: "active" | "pending"
├── storeIds: string[]（担当店舗ID配列）
└── createdAt: Timestamp
```

### preRegisteredUsers
```
auto ID
├── email: string
├── role: string
├── storeIds: string[]
└── createdAt: Timestamp
```

### brands
```
auto ID
├── name: string
├── description: string
└── createdAt: Timestamp
```

### taskTemplates
```
auto ID
├── taskCode: string（ユーザー指定ID。例: BE-B-01）
├── brandId: string
├── name: string
├── phase: string
├── basePhaseCode: string（01〜09）
├── startDaysFromBase: number（マイナス値可）
├── endDaysFromBase: number（マイナス値可）
├── deadlineDescription: string
├── details: string
├── ownerMessage: string（PM用メモ、オーナーには見せない）
├── ownerResources: string
├── visibleToOwner: boolean
├── ownerSensitivity: "safe" | "caution" | "secret"
├── dependsOn: string（前提タスクのtaskCode、スラッシュ区切り）
└── sortOrder: number
```

### stores
```
auto ID
├── name: string
├── brandId: string
├── brandName: string
├── ownerId: string
├── ownerName: string
├── phaseDates: {
│     "01": { date: "2026-06-01" | null, type: "auto"|"manual", label: "加盟契約日" },
│     "02": { ... },
│     ... "09": { ... }
│   }
├── openingDate: string | null
└── createdAt: Timestamp
```

### tasks
```
auto ID
├── taskCode: string（ユーザー指定ID）
├── storeId: string
├── templateId: string | null
├── name: string
├── phase: string
├── basePhaseCode: string
├── idealStartDate: Timestamp（理想開始日、自動計算）
├── idealEndDate: Timestamp（理想完了日、自動計算）
├── startDate: Timestamp（実際の開始日、PM変更可能）
├── deadline: Timestamp（実際の完了期限、PM変更可能）
├── deadlineDescription: string
├── assigneeId: string
├── assigneeName: string
├── details: string
├── ownerMessage: string（PM用メモ）
├── ownerResources: string
├── status: "not_started" | "in_progress" | "done"
├── visibleToOwner: boolean
├── ownerSensitivity: "safe" | "caution" | "secret"
├── dependsOn: string（前提タスクtaskCode、スラッシュ区切り）
├── isManual: boolean
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

### comments
```
auto ID
├── taskId: string
├── storeId: string
├── authorId: string
├── authorName: string
├── authorPhotoURL: string
├── content: string
└── createdAt: Timestamp
```

### webhookLogs
```
auto ID
├── storeId: string
├── sfPhaseCode: string
├── sfPhaseName: string
├── wbsPhase: string
├── sfRecordId: string
├── action: string
├── tasksAffected: number
└── receivedAt: Timestamp
```

---

## Firestoreインデックス（必要な4つ）

| コレクション | フィールド1 | フィールド2 |
|--|--|--|
| tasks | storeId (昇順) | deadline (昇順) |
| tasks | storeId (昇順) | basePhaseCode (昇順) |
| taskTemplates | brandId (昇順) | sortOrder (昇順) |
| comments | taskId (昇順) | createdAt (降順) |

---

## Firestoreセキュリティルール

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function getUserRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isAdmin() { return isAuthenticated() && getUserRole() == 'admin'; }
    function isPMOrAdmin() { return isAuthenticated() && getUserRole() in ['admin', 'pm']; }

    match /users/{userId} { allow read: if isAuthenticated(); allow create: if isAuthenticated(); allow update, delete: if isAdmin(); }
    match /preRegisteredUsers/{docId} { allow read, write: if isPMOrAdmin(); }
    match /brands/{brandId} { allow read: if isAuthenticated(); allow write: if isAdmin(); }
    match /stores/{storeId} { allow read: if isAuthenticated(); allow create, update: if isPMOrAdmin(); allow delete: if isAdmin(); }
    match /taskTemplates/{templateId} { allow read: if isAuthenticated(); allow write: if isAdmin(); }
    match /tasks/{taskId} { allow read: if isAuthenticated(); allow create, update, delete: if isPMOrAdmin(); }
    match /comments/{commentId} { allow read: if isAuthenticated(); allow create: if isAuthenticated(); allow delete: if isAuthenticated() && request.auth.uid == resource.data.authorId; }
    match /webhookLogs/{logId} { allow read: if isPMOrAdmin(); }
  }
}
```

---

## 環境変数（Vercel + .env.local）

| 変数名 | 用途 | 必須 |
|--------|------|------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase Client | ○ |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase Client | ○ |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firebase Client | ○ |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Firebase Client | ○ |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase Client | ○ |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase Client | ○ |
| FIREBASE_ADMIN_PROJECT_ID | Firebase Admin | ○ |
| FIREBASE_ADMIN_CLIENT_EMAIL | Firebase Admin | ○ |
| FIREBASE_ADMIN_PRIVATE_KEY | Firebase Admin | ○ |
| SF_WEBHOOK_SECRET | Salesforce連携 | △ |
| SLACK_WEBHOOK_URL | Slack通知 | △ |
| CRON_SECRET | Vercel Cron認証 | △ |

---

## デプロイ方法

Vercel Hobbyプランでは、コミット作者がVercelアカウントと一致しないとBlockedになる。

```
方法1: VSCodeのターミナルからpush（推奨）
  git pull && git push origin main
  → Vercelが自動デプロイ

方法2: Claude Codeでコミット後、VSCodeから
  git pull && git push origin main

方法3: Blockedになった場合
  git commit --allow-empty -m "redeploy" && git push origin main
```

---

## Salesforce連携

| 項目 | 値 |
|------|-----|
| オブジェクト | PM__c |
| フェーズ項目 | PM_Phase__c |
| 店舗名項目 | PM_AccountName__c |
| Webhook URL | https://shutten-wbs-app.vercel.app/api/salesforce/webhook |

SFでフェーズ変更 → フローでHTTP POST → WBSのタスクが自動で進行中に変更。
詳細はSALESFORCE-SETUP.mdを参照。

---

## フェーズ基準日の仕組み

| フェーズ | コード | 記録方式 |
|---------|--------|---------|
| 不動産探し中 | 01 | 手入力（加盟契約日） |
| 物件内見中 | 02 | SFフェーズ変更時に自動 |
| 不動産審査中 | 03 | 自動 |
| 現場調査 | 04 | 自動 |
| 不動産契約 | 05 | 手入力（契約予定日） |
| 内装検討中 | 06 | 自動 |
| 施工実施中 | 07 | 手入力（完工予定日） |
| 備品設置中 | 08 | 自動 |
| 出店完了 | 09 | 手入力（出店予定日） |

全て手動修正可能（店舗詳細 → 鉛筆アイコン → フェーズ基準日）。
基準日変更時、紐づくタスクの理想期限が自動再計算される。

---

## CSVフォーマット

### テンプレートCSV
```
タスクID,タスク名,フェーズ,基準フェーズコード,開始日数,完了日数,期限設定,詳細,オーナー共有文章,共有資料URL,公開区分,前提タスク,表示順
BE-B-01,備品リスト作成,備品設置,07,-10,0,完工10日前から完工日まで,,,url,safe,,0
BE-B-02,備品発注,備品設置,07,0,5,完工日から5日後まで,,,,safe,BE-B-01,1
```

### タスクCSV（店舗用）
```
タスクID,タスク名,フェーズ,開始日,完了期限,実行者,詳細,共有資料URL,公開区分,前提タスク
BE-B-01,備品リスト作成,備品設置,2026-08-01,2026-08-10,PM田中,,,safe,
BE-B-02,備品発注,備品設置,2026-08-10,2026-08-15,PM田中,,,safe,BE-B-01
```

CSV取込時にtaskCodeが一致するタスクは上書き更新（ステータスは維持）。

---

## 既知の課題・未対応事項

| # | 内容 | 優先度 |
|---|------|--------|
| 1 | テンプレートCSVのフェーズ名とPHASE_DEFINITIONSのdateLabelが一致しないと色が付かない | 中 |
| 2 | Slack通知の環境変数が未設定の場合のテスト | 低 |
| 3 | Googleカレンダーの重複登録防止（同じタスクを2回登録すると重複） | 中 |
| 4 | タスク一括削除機能（フィルターしたタスクをまとめて削除） | 低 |
| 5 | テンプレート編集機能（現状は削除→再登録） | 中 |
| 6 | オーナー画面でのコメント通知（現状はSlackのみ） | 低 |
| 7 | ダッシュボードの読み込み速度改善（全店舗のタスクを順次取得している） | 高 |
| 8 | スマホ対応のガントチャート表示最適化 | 中 |
