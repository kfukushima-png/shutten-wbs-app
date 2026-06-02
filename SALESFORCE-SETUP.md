# Salesforce → WBS連携 設定手順書

## 前提情報

| 項目 | 値 |
|------|-----|
| Salesforceオブジェクト | `PM__c` |
| フェーズ項目 | `PM_Phase__c` |
| 店舗名項目 | `PM_AccountName__c` |
| WBS Webhook URL | `https://shutten-wbs-app.vercel.app/api/salesforce/webhook` |

---

## Step 1: Vercelに環境変数を追加

Vercel → プロジェクト → Settings → Environment Variables に追加：

```
SF_WEBHOOK_SECRET = （任意の文字列。例: wbs-sf-2024-xK9mP3qR7）
```

※ この値はStep 3でSalesforceにも設定します。両方同じ値にしてください。

---

## Step 2: Salesforceで「外部資格情報」と「指定ログイン情報」を設定

### 2-1. 外部資格情報の作成

```
設定 → セキュリティ → 外部資格情報 → 新規
```

| 設定項目 | 値 |
|---------|-----|
| 表示ラベル | WBS Webhook |
| 名前 | WBS_Webhook |
| 認証プロトコル | カスタム（ヘッダーなし） |

### 2-2. 指定ログイン情報の作成

```
設定 → セキュリティ → 指定ログイン情報 → 新規
```

| 設定項目 | 値 |
|---------|-----|
| 表示ラベル | WBS API |
| 名前 | WBS_API |
| URL | `https://shutten-wbs-app.vercel.app` |
| 外部資格情報 | WBS Webhook（上で作ったもの） |

---

## Step 3: Salesforceでフローを作成

```
設定 → フロー → 新規フロー
```

### 3-1. フローの種類

**「レコードトリガーフロー」** を選択

### 3-2. トリガー設定

| 設定項目 | 値 |
|---------|-----|
| オブジェクト | PM__c |
| フローをトリガする条件 | レコードが更新された |
| エントリ条件 | `PM_Phase__c` が変更された（isChanged） |
| フローを最適化 | アクションと関連レコード |

### 3-3. アクションを追加：「HTTP コールアウト」

フロー画面で「＋」→「アクション」→「HTTP コールアウト」を選択

※ もし「HTTP コールアウト」が見つからない場合は、「Apexアクション」で代替します（後述）

#### HTTP コールアウト設定

| 設定項目 | 値 |
|---------|-----|
| 表示ラベル | WBSフェーズ通知 |
| API名 | WBS_Phase_Notify |
| URL | `/api/salesforce/webhook`（指定ログイン情報の相対パス） |
| 指定ログイン情報 | WBS_API（Step 2で作成） |
| メソッド | POST |
| Content-Type | application/json |

#### リクエストBody

```json
{
  "storeName": "{!$Record.PM_AccountName__c}",
  "sfPhaseName": "{!$Record.PM_Phase__c}",
  "sfRecordId": "{!$Record.Id}",
  "secret": "（Vercelに設定したのと同じシークレット）"
}
```

### 3-4. 保存して有効化

1. フロー名: 「WBS フェーズ連携」
2. **「保存」** → **「有効化」**

---

## Step 4: 動作確認

1. Salesforceで任意のPMレコードを開く
2. フェーズを変更して保存
3. WBSアプリでその店舗のタスクステータスが変わっていることを確認

### 確認用API（ブラウザでアクセス）

```
https://shutten-wbs-app.vercel.app/api/salesforce/webhook
```

GETでアクセスすると `{"status":"ok"}` と表示されれば、エンドポイントは正常です。

---

## 代替案: HTTP コールアウトが使えない場合

Salesforceのエディションによっては「HTTP コールアウト」が使えません。
その場合は **Apex クラス** を作成して対応します。

### Apex クラス

```
設定 → Apex クラス → 新規
```

```apex
public class WBSWebhookCallout {

    @InvocableMethod(label='WBSフェーズ通知' description='WBSアプリにフェーズ変更を通知')
    public static void sendPhaseUpdate(List<Request> requests) {
        for (Request req : requests) {
            sendCallout(req.storeName, req.phaseName, req.recordId);
        }
    }

    @future(callout=true)
    private static void sendCallout(String storeName, String phaseName, String recordId) {
        HttpRequest httpReq = new HttpRequest();
        httpReq.setEndpoint('https://shutten-wbs-app.vercel.app/api/salesforce/webhook');
        httpReq.setMethod('POST');
        httpReq.setHeader('Content-Type', 'application/json');

        Map<String, String> body = new Map<String, String>{
            'storeName' => storeName,
            'sfPhaseName' => phaseName,
            'sfRecordId' => recordId,
            'secret' => 'ここにシークレットを入力'
        };
        httpReq.setBody(JSON.serialize(body));

        Http http = new Http();
        HttpResponse res = http.send(httpReq);
        System.debug('WBS Response: ' + res.getStatusCode() + ' ' + res.getBody());
    }

    public class Request {
        @InvocableVariable(label='店舗名' required=true)
        public String storeName;

        @InvocableVariable(label='フェーズ名' required=true)
        public String phaseName;

        @InvocableVariable(label='レコードID' required=true)
        public String recordId;
    }
}
```

### リモートサイト設定

Apex を使う場合、リモートサイト設定も必要です。

```
設定 → セキュリティ → リモートサイトの設定 → 新規
```

| 設定項目 | 値 |
|---------|-----|
| リモートサイト名 | WBS_App |
| リモートサイトの URL | `https://shutten-wbs-app.vercel.app` |
| 有効 | チェック |

### フローでApexアクションを使用

フローの「＋」→「アクション」→「Apex」→「WBSフェーズ通知」を選択

| 入力 | 値 |
|------|-----|
| storeName | `{!$Record.PM_AccountName__c}` |
| phaseName | `{!$Record.PM_Phase__c}` |
| recordId | `{!$Record.Id}` |

---

## フェーズ対応表

| SFフェーズ | WBSフェーズ | 動作 |
|-----------|-----------|------|
| 00: 出店停止 | ― | 全タスク一時停止 |
| 01: 不動産探し中 | 不動産探し | タスク開始 |
| 02: 物件内見中 | 物件内見 | タスク開始 |
| 03: 不動産審査中 | 不動産審査 | タスク開始 |
| 04: 現場調査 | 現場調査 | タスク開始 |
| 05: 不動産契約 | 不動産契約 | **基準日設定** + タスク開始 |
| 06: 内装検討中 | 内装検討 | タスク開始 |
| 07: 施工実施中 | 施工実施 | タスク開始 |
| 08: 備品設置中 | 備品設置 | タスク開始 |
| 09: 出店完了 | 出店完了 | タスク開始 |

※ WBSのテンプレート作成時に、上記の「WBSフェーズ」名と一致させてください。
