export type UserRole = "admin" | "pm" | "owner";
export type UserStatus = "active" | "pending";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  storeIds: string[];
  createdAt: Date;
}

export type TaskStatus = "not_started" | "in_progress" | "done";

export type OwnerSensitivity = "safe" | "caution" | "secret";

export const sensitivityLabels: Record<OwnerSensitivity, string> = {
  safe: "公開OK",
  caution: "要確認",
  secret: "非公開",
};

export const sensitivityColors: Record<OwnerSensitivity, string> = {
  safe: "bg-green-100 text-green-700",
  caution: "bg-yellow-100 text-yellow-700",
  secret: "bg-red-100 text-red-700",
};

export interface PhaseDate {
  date: Date | null;
  type: "auto" | "manual";
  label: string;
}

export const PHASE_DEFINITIONS: {
  code: string;
  name: string;
  dateType: "auto" | "manual";
  dateLabel: string;
}[] = [
  { code: "01", name: "不動産探し中", dateType: "manual", dateLabel: "加盟契約日" },
  { code: "02", name: "物件内見中", dateType: "auto", dateLabel: "物件内見開始日" },
  { code: "03", name: "不動産審査中", dateType: "auto", dateLabel: "審査開始日" },
  { code: "04", name: "現場調査", dateType: "auto", dateLabel: "現場調査開始日" },
  { code: "05", name: "不動産契約", dateType: "manual", dateLabel: "契約予定日" },
  { code: "06", name: "内装検討中", dateType: "auto", dateLabel: "内装検討開始日" },
  { code: "07", name: "施工実施中", dateType: "manual", dateLabel: "完工予定日" },
  { code: "08", name: "備品設置中", dateType: "auto", dateLabel: "備品設置開始日" },
  { code: "09", name: "出店完了", dateType: "manual", dateLabel: "出店予定日" },
];

// フェーズ色（テーブルの左ボーダーやバッジに使用）
export const PHASE_COLORS: Record<string, string> = {
  "加盟契約日": "border-l-blue-400",
  "物件内見開始": "border-l-cyan-400",
  "物件内見": "border-l-cyan-400",
  "審査開始": "border-l-purple-400",
  "不動産審査": "border-l-purple-400",
  "現場調査開始": "border-l-amber-400",
  "現場調査": "border-l-amber-400",
  "契約予定日": "border-l-green-500",
  "不動産契約": "border-l-green-500",
  "内装検討開始": "border-l-orange-400",
  "内装検討": "border-l-orange-400",
  "完工予定日": "border-l-red-400",
  "施工実施": "border-l-red-400",
  "備品設置開始": "border-l-pink-400",
  "備品設置": "border-l-pink-400",
  "出店予定日": "border-l-emerald-500",
  "出店完了": "border-l-emerald-500",
};

export const PHASE_BG_COLORS: Record<string, string> = {
  "加盟契約日": "bg-blue-50 text-blue-700",
  "物件内見開始": "bg-cyan-50 text-cyan-700",
  "物件内見": "bg-cyan-50 text-cyan-700",
  "審査開始": "bg-purple-50 text-purple-700",
  "不動産審査": "bg-purple-50 text-purple-700",
  "現場調査開始": "bg-amber-50 text-amber-700",
  "現場調査": "bg-amber-50 text-amber-700",
  "契約予定日": "bg-green-50 text-green-700",
  "不動産契約": "bg-green-50 text-green-700",
  "内装検討開始": "bg-orange-50 text-orange-700",
  "内装検討": "bg-orange-50 text-orange-700",
  "完工予定日": "bg-red-50 text-red-700",
  "施工実施": "bg-red-50 text-red-700",
  "備品設置開始": "bg-pink-50 text-pink-700",
  "備品設置": "bg-pink-50 text-pink-700",
  "出店予定日": "bg-emerald-50 text-emerald-700",
  "出店完了": "bg-emerald-50 text-emerald-700",
};

export interface Brand {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
}

export interface TaskTemplate {
  id: string;
  taskCode: string; // ユーザー指定のタスクID（例: BE-B-01）
  brandId: string;
  name: string;
  phase: string;
  basePhaseCode: string;
  startDaysFromBase: number;
  endDaysFromBase: number;
  deadlineDescription: string;
  details: string;
  ownerMessage: string;
  ownerResources: string;
  visibleToOwner: boolean;
  ownerSensitivity: OwnerSensitivity;
  dependsOn: string; // 前提タスクのtaskCode（複数はスラッシュ区切り: "BE-B-01 / BE-S-01"）
  sortOrder: number;
}

export interface Task {
  id: string;
  taskCode: string; // ユーザー指定のタスクID（例: BE-B-01）
  storeId: string;
  templateId: string | null;
  name: string;
  phase: string;
  basePhaseCode: string;
  idealStartDate: Date;
  idealEndDate: Date;
  startDate: Date;
  deadline: Date;
  deadlineDescription: string;
  assigneeId: string;
  assigneeName: string;
  details: string;
  ownerMessage: string;
  ownerResources: string;
  status: TaskStatus;
  visibleToOwner: boolean;
  ownerSensitivity: OwnerSensitivity;
  dependsOn: string; // 前提タスクのtaskCode（複数はスラッシュ区切り）
  isManual: boolean;
  calendarEventId?: string;
  sortOrder?: number;
  showOnGantt?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  storeId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  content: string;
  createdAt: Date;
}

export interface Store {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  ownerId: string;
  ownerName: string;
  phaseDates: Record<string, { date: string | null; type: string; label: string }>;
  openingDate: string | null;
  createdAt: Date;
}
