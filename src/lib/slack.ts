// Slack Incoming Webhook 通知

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

export async function sendSlackNotification(message: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("SLACK_WEBHOOK_URL is not set, skipping notification");
    return false;
  }

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch (error) {
    console.error("Slack notification failed:", error);
    return false;
  }
}

// --- 定型通知メッセージ ---

export async function notifyPhaseChange(storeName: string, phaseName: string, tasksActivated: number) {
  return sendSlackNotification({
    text: `📋 ${storeName} のフェーズが「${phaseName}」に変更されました`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📋 フェーズ変更: ${storeName}`, emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*店舗:*\n${storeName}` },
          { type: "mrkdwn", text: `*新フェーズ:*\n${phaseName}` },
          { type: "mrkdwn", text: `*開始タスク数:*\n${tasksActivated}件` },
        ],
      },
    ],
  });
}

export async function notifyDeadlineReminder(
  storeName: string,
  tasks: { name: string; deadline: string; assigneeName: string }[],
  daysLabel: string,
) {
  const taskList = tasks.map((t) => `• *${t.name}* (${t.deadline}) - ${t.assigneeName}`).join("\n");
  return sendSlackNotification({
    text: `⏰ ${storeName}: ${daysLabel}のタスクが${tasks.length}件あります`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `⏰ 期限リマインド: ${storeName}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${daysLabel}のタスク (${tasks.length}件):*\n${taskList}` },
      },
    ],
  });
}

export async function notifyTaskCompleted(storeName: string, taskName: string, completedBy: string) {
  return sendSlackNotification({
    text: `✅ ${storeName}: 「${taskName}」が完了しました (${completedBy})`,
  });
}

export async function notifyOverdueTasks(
  storeName: string,
  tasks: { name: string; deadline: string; daysOverdue: number }[],
) {
  const taskList = tasks.map((t) => `• *${t.name}* (${t.daysOverdue}日超過)`).join("\n");
  return sendSlackNotification({
    text: `🚨 ${storeName}: ${tasks.length}件のタスクが期限超過しています`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🚨 期限超過: ${storeName}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*超過中のタスク (${tasks.length}件):*\n${taskList}` },
      },
    ],
  });
}

export async function notifyNewComment(storeName: string, taskName: string, authorName: string, comment: string) {
  const preview = comment.length > 100 ? comment.substring(0, 100) + "..." : comment;
  return sendSlackNotification({
    text: `💬 ${storeName} - ${taskName}: ${authorName}がコメント「${preview}」`,
  });
}
