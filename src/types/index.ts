export type UserRole = "admin" | "pm" | "owner";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  storeIds: string[];
  createdAt: Date;
}

export type TaskStatus = "not_started" | "in_progress" | "done";

// "safe" = オーナーに見せて問題ない
// "caution" = 内容次第で注意が必要（例: 内装工事の見積もり）
// "secret" = オーナーには絶対見せない（例: 祝福の花の発注）
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

export interface Brand {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
}

export interface TaskTemplate {
  id: string;
  brandId: string;
  name: string;
  phase: string;
  defaultDurationDays: number;
  deadlineDescription: string;
  details: string;
  ownerMessage: string;
  ownerResources: string;
  visibleToOwner: boolean;
  ownerSensitivity: OwnerSensitivity;
  sortOrder: number;
}

export interface Task {
  id: string;
  storeId: string;
  templateId: string | null;
  name: string;
  phase: string;
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
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Store {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  ownerId: string;
  ownerName: string;
  baseDate: Date;
  createdAt: Date;
}
