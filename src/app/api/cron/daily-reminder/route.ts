import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { notifyDeadlineReminder, notifyOverdueTasks } from "@/lib/slack";
import { format, differenceInDays } from "date-fns";

// 毎朝実行: 期限リマインド + 期限超過通知
// Vercel Cronで /api/cron/daily-reminder を毎朝9時に実行

export async function GET(req: NextRequest) {
  // Vercel Cronの認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const storesSnap = await adminDb.collection("stores").get();

    let totalNotifications = 0;

    for (const storeDoc of storesSnap.docs) {
      const store = storeDoc.data();
      const tasksSnap = await adminDb
        .collection("tasks")
        .where("storeId", "==", storeDoc.id)
        .get();

      const tasks = tasksSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name as string,
          status: data.status as string,
          deadline: data.deadline.toDate() as Date,
          assigneeName: (data.assigneeName || "未割当") as string,
        };
      });

      // 期限超過タスク
      const overdueTasks = tasks.filter(
        (t) => t.status !== "done" && t.deadline < today
      );

      if (overdueTasks.length > 0) {
        await notifyOverdueTasks(
          store.name,
          overdueTasks.map((t) => ({
            name: t.name,
            deadline: format(t.deadline, "yyyy/MM/dd"),
            daysOverdue: differenceInDays(today, t.deadline),
          }))
        );
        totalNotifications++;
      }

      // 今日期限のタスク
      const todayTasks = tasks.filter(
        (t) => t.status !== "done" &&
          t.deadline >= today &&
          t.deadline < tomorrow
      );

      if (todayTasks.length > 0) {
        await notifyDeadlineReminder(
          store.name,
          todayTasks.map((t) => ({
            name: t.name,
            deadline: format(t.deadline, "yyyy/MM/dd"),
            assigneeName: t.assigneeName || "未割当",
          })),
          "本日期限"
        );
        totalNotifications++;
      }

      // 3日以内に期限のタスク
      const upcomingTasks = tasks.filter(
        (t) => t.status !== "done" &&
          t.deadline >= tomorrow &&
          t.deadline <= threeDaysLater
      );

      if (upcomingTasks.length > 0) {
        await notifyDeadlineReminder(
          store.name,
          upcomingTasks.map((t) => ({
            name: t.name,
            deadline: format(t.deadline, "yyyy/MM/dd"),
            assigneeName: t.assigneeName || "未割当",
          })),
          "3日以内に期限"
        );
        totalNotifications++;
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: totalNotifications,
      storesChecked: storesSnap.size,
    });
  } catch (error) {
    console.error("Daily reminder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
