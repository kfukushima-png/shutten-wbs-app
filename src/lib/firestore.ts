import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { Store, Task, TaskTemplate, AppUser, TaskStatus, Brand } from "@/types";

function db() {
  return getFirebaseDb();
}

function toDate(ts: unknown): Date {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts as string);
}

// --- Users ---
export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db(), "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
}

export async function createUser(uid: string, data: Omit<AppUser, "uid">) {
  await setDoc(doc(db(), "users", uid), { ...data, createdAt: Timestamp.now() });
}

export async function updateUser(uid: string, data: Partial<AppUser>) {
  await updateDoc(doc(db(), "users", uid), data as Record<string, unknown>);
}

export async function deleteUser(uid: string) {
  await deleteDoc(doc(db(), "users", uid));
}

// --- Brands ---
export async function getBrands(): Promise<Brand[]> {
  const snap = await getDocs(query(collection(db(), "brands"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as Brand;
  });
}

export async function getBrand(id: string): Promise<Brand | null> {
  const snap = await getDoc(doc(db(), "brands", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id, ...data, createdAt: toDate(data.createdAt) } as Brand;
}

export async function createBrand(data: Omit<Brand, "id" | "createdAt">) {
  const ref = await addDoc(collection(db(), "brands"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateBrand(id: string, data: Partial<Brand>) {
  await updateDoc(doc(db(), "brands", id), data as Record<string, unknown>);
}

export async function deleteBrand(id: string) {
  await deleteDoc(doc(db(), "brands", id));
}

// --- Stores ---
export async function getStores(): Promise<Store[]> {
  const snap = await getDocs(query(collection(db(), "stores"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, baseDate: toDate(data.baseDate), createdAt: toDate(data.createdAt) } as Store;
  });
}

export async function getStore(id: string): Promise<Store | null> {
  const snap = await getDoc(doc(db(), "stores", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id, ...data, baseDate: toDate(data.baseDate), createdAt: toDate(data.createdAt) } as Store;
}

export async function createStore(data: Omit<Store, "id" | "createdAt">) {
  const ref = await addDoc(collection(db(), "stores"), {
    ...data,
    baseDate: Timestamp.fromDate(data.baseDate),
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

// --- Task Templates ---
export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const snap = await getDocs(query(collection(db(), "taskTemplates"), orderBy("sortOrder")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskTemplate);
}

export async function getTaskTemplatesByBrand(brandId: string): Promise<TaskTemplate[]> {
  const snap = await getDocs(
    query(collection(db(), "taskTemplates"), where("brandId", "==", brandId), orderBy("sortOrder"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskTemplate);
}

export async function createTaskTemplate(data: Omit<TaskTemplate, "id">) {
  const ref = await addDoc(collection(db(), "taskTemplates"), data);
  return ref.id;
}

export async function updateTaskTemplate(id: string, data: Partial<TaskTemplate>) {
  await updateDoc(doc(db(), "taskTemplates", id), data as Record<string, unknown>);
}

export async function deleteTaskTemplate(id: string) {
  await deleteDoc(doc(db(), "taskTemplates", id));
}

// --- Tasks ---
export async function getTasksByStore(storeId: string): Promise<Task[]> {
  const snap = await getDocs(
    query(collection(db(), "tasks"), where("storeId", "==", storeId), orderBy("deadline"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      deadline: toDate(data.deadline),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Task;
  });
}

export async function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">) {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db(), "tasks"), {
    ...data,
    deadline: Timestamp.fromDate(data.deadline),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<Task>) {
  const update: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
  if (data.deadline) update.deadline = Timestamp.fromDate(data.deadline);
  await updateDoc(doc(db(), "tasks", id), update);
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await updateDoc(doc(db(), "tasks", id), { status, updatedAt: Timestamp.now() });
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db(), "tasks", id));
}

// --- Store初期タスク生成（ブランド別テンプレートから） ---
export async function generateTasksFromTemplates(
  storeId: string,
  brandId: string,
  baseDate: Date,
  assigneeId: string,
  assigneeName: string,
) {
  const templates = await getTaskTemplatesByBrand(brandId);
  for (const tpl of templates) {
    const deadline = new Date(baseDate);
    deadline.setDate(deadline.getDate() + tpl.defaultDurationDays);
    await createTask({
      storeId,
      templateId: tpl.id,
      name: tpl.name,
      phase: tpl.phase,
      deadline,
      deadlineDescription: tpl.deadlineDescription,
      assigneeId,
      assigneeName,
      details: tpl.details,
      ownerMessage: tpl.ownerMessage,
      ownerResources: tpl.ownerResources,
      status: "not_started",
      visibleToOwner: tpl.ownerSensitivity === "safe" ? tpl.visibleToOwner : false,
      ownerSensitivity: tpl.ownerSensitivity || "safe",
      isManual: false,
    });
  }
}

// --- 重複チェック付きタスク一括追加 ---
export interface DuplicateCheckResult {
  newTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[];
  duplicates: {
    incoming: Omit<Task, "id" | "createdAt" | "updatedAt">;
    existing: Task;
  }[];
}

export async function checkDuplicateTasks(
  storeId: string,
  incomingTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[],
): Promise<DuplicateCheckResult> {
  const existingTasks = await getTasksByStore(storeId);

  const newTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[] = [];
  const duplicates: DuplicateCheckResult["duplicates"] = [];

  for (const incoming of incomingTasks) {
    const match = existingTasks.find(
      (existing) =>
        existing.name.trim() === incoming.name.trim() &&
        existing.phase.trim() === incoming.phase.trim(),
    );

    if (match) {
      duplicates.push({ incoming, existing: match });
    } else {
      newTasks.push(incoming);
    }
  }

  return { newTasks, duplicates };
}

export async function bulkCreateTasks(tasks: Omit<Task, "id" | "createdAt" | "updatedAt">[]) {
  const results: string[] = [];
  for (const task of tasks) {
    const id = await createTask(task);
    results.push(id);
  }
  return results;
}
