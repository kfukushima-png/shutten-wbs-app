"use client";

import { useRequireRole } from "@/lib/auth-context";

export default function IntegrationsPage() {
  const { hasAccess, loading } = useRequireRole(["admin", "pm"]);

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">外部連携設定</h1>

      {/* Slack連携ガイド */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Slack通知連携</h2>
            <p className="text-sm text-gray-500">期限リマインド・フェーズ変更をSlackに自動通知</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-gray-700 mb-2">Step 1: Slack Incoming Webhookを作成</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
              <li>
                <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline">https://api.slack.com/apps</a> にアクセス
              </li>
              <li><span className="font-medium">「Create New App」</span> → <span className="font-medium">「From scratch」</span></li>
              <li>App Name: <span className="font-mono bg-white px-1 rounded border">WBS通知</span>、Workspace を選択 → <span className="font-medium">「Create App」</span></li>
              <li>左メニュー → <span className="font-medium">「Incoming Webhooks」</span> → <span className="font-medium">ON</span> にする</li>
              <li><span className="font-medium">「Add New Webhook to Workspace」</span> をクリック</li>
              <li>通知先のチャンネルを選択（例: <span className="font-mono bg-white px-1 rounded border">#出店管理</span>）→ <span className="font-medium">「許可する」</span></li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-2">Step 2: Webhook URLをコピー</h3>
            <p className="text-gray-600 mb-2">作成後に表示されるURLをコピーしてください。以下のような形式です:</p>
            <div className="bg-white border rounded-lg px-3 py-2 font-mono text-xs text-gray-700 break-all">
              https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
            </div>
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <p className="text-yellow-800 text-xs font-medium">このURLは秘密情報です。他の人に共有しないでください。</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-2">Step 3: Vercelに設定</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
              <li><a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Vercel</a> → プロジェクト → <span className="font-medium">Settings</span> → <span className="font-medium">Environment Variables</span></li>
              <li>以下を追加:
                <table className="mt-1 w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-1 font-mono font-medium pr-4">SLACK_WEBHOOK_URL</td>
                      <td className="py-1 text-gray-500">Step 2でコピーしたURL</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-mono font-medium pr-4">CRON_SECRET</td>
                      <td className="py-1 text-gray-500">任意の文字列（例: <span className="font-mono">cron-wbs-2024-xyz</span>）</td>
                    </tr>
                  </tbody>
                </table>
              </li>
              <li><span className="font-medium">「Save」</span> → プロジェクトを再デプロイ</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-blue-800 text-xs font-medium mb-1">通知される内容:</p>
            <ul className="text-blue-700 text-xs space-y-0.5">
              <li>• 毎朝: 期限超過タスク、本日期限、3日以内期限のリマインド</li>
              <li>• Salesforceフェーズ変更時の通知</li>
              <li>• タスク完了時の通知</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Googleカレンダー連携ガイド */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Googleカレンダー連携</h2>
            <p className="text-sm text-gray-500">タスク期限をGoogleカレンダーに一括登録</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-gray-700 mb-2">設定不要 — 画面から直接操作</h3>
            <p className="text-gray-600 mb-3">
              Googleカレンダー連携には追加の設定は不要です。<br />
              店舗詳細ページの <span className="font-medium">「カレンダーに登録」</span> ボタンを押すだけで動作します。
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-2">操作手順</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
              <li>店舗詳細ページを開く</li>
              <li>上部の <span className="inline-flex items-center gap-1 bg-white border rounded px-2 py-0.5 text-xs font-medium">📅 カレンダーに登録</span> ボタンをクリック</li>
              <li>Googleアカウントの権限確認画面が表示 → <span className="font-medium">「許可」</span></li>
              <li>未完了タスクの期限が、あなたのGoogleカレンダーに一括登録されます</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-blue-800 text-xs font-medium mb-1">登録される内容:</p>
            <ul className="text-blue-700 text-xs space-y-0.5">
              <li>• イベント名: 【店舗名】タスク名</li>
              <li>• 日付: タスクの期限日（終日イベント）</li>
              <li>• リマインダー: 1日前 + 1時間前にポップアップ通知</li>
              <li>• 完了済みタスクは登録されません</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <p className="text-yellow-800 text-xs font-medium mb-1">注意:</p>
            <ul className="text-yellow-700 text-xs space-y-0.5">
              <li>• 登録先はボタンを押した人のGoogleカレンダーです</li>
              <li>• 同じタスクを複数回登録すると重複しますのでご注意ください</li>
              <li>• PM以上の権限が必要です（オーナーには表示されません）</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Salesforce連携ガイド */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Salesforce連携</h2>
            <p className="text-sm text-gray-500">SFのフェーズ変更でWBSタスクを自動更新</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-gray-700 mb-2">Step 1: Vercelに環境変数を追加</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1 font-mono font-medium pr-4">SF_WEBHOOK_SECRET</td>
                  <td className="py-1 text-gray-500">任意の文字列（例: <span className="font-mono">wbs-sf-2024-xK9mP3</span>）</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-2">Step 2: Salesforceでフローを作成</h3>
            <p className="text-gray-600 mb-2">詳細な手順は <span className="font-mono bg-white px-1 rounded border text-xs">SALESFORCE-SETUP.md</span> を参照してください。</p>
            <div className="bg-white border rounded-lg px-3 py-2 text-xs">
              <p className="font-medium text-gray-700 mb-1">Webhook URL（Salesforceのフローに設定）:</p>
              <code className="text-blue-600 break-all">https://shutten-wbs-app.vercel.app/api/salesforce/webhook</code>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-2">連携対象のAPI名</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1 font-medium text-gray-700 pr-4">オブジェクト</td>
                  <td className="py-1 font-mono">PM__c</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1 font-medium text-gray-700 pr-4">フェーズ項目</td>
                  <td className="py-1 font-mono">PM_Phase__c</td>
                </tr>
                <tr>
                  <td className="py-1 font-medium text-gray-700 pr-4">店舗名項目</td>
                  <td className="py-1 font-mono">PM_AccountName__c</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
