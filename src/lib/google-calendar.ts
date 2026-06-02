// Google Calendar API でタスク期限をカレンダーイベントとして登録
// ユーザーのアクセストークンを使って、ユーザー本人のカレンダーにイベントを作成

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface CalendarEvent {
  summary: string;
  description?: string;
  start: { date: string };
  end: { date: string };
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent,
  calendarId: string = "primary",
): Promise<{ id: string; htmlLink: string } | null> {
  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) {
      console.error("Google Calendar API error:", await res.text());
      return null;
    }

    const data = await res.json();
    return { id: data.id, htmlLink: data.htmlLink };
  } catch (error) {
    console.error("Google Calendar error:", error);
    return null;
  }
}

export function buildTaskEvent(
  storeName: string,
  taskName: string,
  deadline: Date,
  details?: string,
): CalendarEvent {
  const dateStr = deadline.toISOString().split("T")[0];
  const nextDay = new Date(deadline);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDateStr = nextDay.toISOString().split("T")[0];

  return {
    summary: `【${storeName}】${taskName}`,
    description: details || "",
    start: { date: dateStr },
    end: { date: nextDateStr },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 1440 }, // 1日前
        { method: "popup", minutes: 60 },   // 1時間前
      ],
    },
  };
}

export async function addTasksToCalendar(
  accessToken: string,
  storeName: string,
  tasks: { name: string; deadline: Date; details?: string }[],
): Promise<number> {
  let added = 0;
  for (const task of tasks) {
    const event = buildTaskEvent(storeName, task.name, task.deadline, task.details);
    const result = await createCalendarEvent(accessToken, event);
    if (result) added++;
  }
  return added;
}
