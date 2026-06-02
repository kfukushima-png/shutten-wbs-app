import type { TaskStatus } from "@/types";

const config: Record<TaskStatus, { label: string; className: string }> = {
  not_started: { label: "未着手", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "進行中", className: "bg-blue-100 text-blue-700" },
  done: { label: "完了", className: "bg-green-100 text-green-700" },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
