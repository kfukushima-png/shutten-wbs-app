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
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { Store, Task, TaskTemplate, TaskComment, AppUser, TaskStatus, Brand } from "@/types";
import { PHASE_DEFINITIONS } from "@/types";

function db() {
  return getFirebaseDb();
}

function toDate(ts: unknown): Date {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === "string" && ts) return new Date(ts);
  return new Date();
}

function toDateOrNull(ts: unknown): Date | null {
  if (!ts) return null;
  return toDate(ts);
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

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const snap = await getDocs(query(collection(db(), "users"), where("email", "==", email)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() } as AppUser;
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

// 事前登録用（メールアドレスだけ登録しておく）
export async function preRegisterUser(email: string, role: UserRole, storeIds: string[]) {
  const ref = await addDoc(collection(db(), "preRegisteredUsers"), {
    email,
    role,
    storeIds,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getPreRegisteredUser(email: string) {
  const snap = await getDocs(
    query(collection(db(), "preRegisteredUsers"), where("email", "==", email))
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as { id: string; email: string; role: string; storeIds: string[] };
}

export async function deletePreRegisteredUser(id: string) {
  await deleteDoc(doc(db(), "preRegisteredUsers", id));
}

type UserRole = "admin" | "pm" | "owner";

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
  const ref = await addDoc(collection(db(), "brands"), { ...data, createdAt: Timestamp.now() });
  return ref.id;
}

export async function updateBrand(id: string, data: Partial<Brand>) {
  await updateDoc(doc(db(), "brands", id), data as Record<string, unknown>);
}

export async function deleteBrand(id: string) {
  await deleteDoc(doc(db(), "brands", id));
}

// --- Stores ---
function buildInitialPhaseDates(): Record<string, { date: string | null; type: string; label: string }> {
  const phaseDates: Record<string, { date: string | null; type: string; label: string }> = {};
  for (const pd of PHASE_DEFINITIONS) {
    phaseDates[pd.code] = { date: null, type: pd.dateType, label: pd.dateLabel };
  }
  return phaseDates;
}

export async function getStores(): Promise<Store[]> {
  const snap = await getDocs(query(collection(db(), "stores"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      phaseDates: data.phaseDates || buildInitialPhaseDates(),
      createdAt: toDate(data.createdAt),
    } as Store;
  });
}

export async function getStore(id: string): Promise<Store | null> {
  const snap = await getDoc(doc(db(), "stores", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id,
    ...data,
    phaseDates: data.phaseDates || buildInitialPhaseDates(),
    createdAt: toDate(data.createdAt),
  } as Store;
}

export async function createStore(data: Omit<Store, "id" | "createdAt">) {
  const ref = await addDoc(collection(db(), "stores"), {
    ...data,
    phaseDates: data.phaseDates || buildInitialPhaseDates(),
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateStore(id: string, data: Partial<Store>) {
  await updateDoc(doc(db(), "stores", id), data as Record<string, unknown>);
}

export async function updateStorePhaseDate(storeId: string, phaseCode: string, date: string) {
  const store = await getStore(storeId);
  if (!store) return;
  const phaseDates = { ...store.phaseDates };
  const pd = PHASE_DEFINITIONS.find((p) => p.code === phaseCode);
  phaseDates[phaseCode] = {
    date,
    type: pd?.dateType || "manual",
    label: pd?.dateLabel || "",
  };
  await updateDoc(doc(db(), "stores", storeId), { phaseDates });

  // この基準日に紐づくタスクの理想期限を再計算
  await recalculateIdealDeadlines(storeId, phaseCode, new Date(date));
}

async function recalculateIdealDeadlines(storeId: string, phaseCode: string, baseDate: Date) {
  const tasksSnap = await getDocs(
    query(collection(db(), "tasks"), where("storeId", "==", storeId), where("basePhaseCode", "==", phaseCode))
  );
  for (const taskDoc of tasksSnap.docs) {
    const task = taskDoc.data();
    if (task.templateId) {
      const tplSnap = await getDoc(doc(db(), "taskTemplates", task.templateId));
      if (tplSnap.exists()) {
        const tpl = tplSnap.data();
        const idealStartDate = new Date(baseDate);
        idealStartDate.setDate(idealStartDate.getDate() + (tpl.startDaysFromBase || 0));
        const idealEndDate = new Date(baseDate);
        idealEndDate.setDate(idealEndDate.getDate() + (tpl.endDaysFromBase || 0));
        await updateDoc(taskDoc.ref, {
          idealStartDate: Timestamp.fromDate(idealStartDate),
          idealEndDate: Timestamp.fromDate(idealEndDate),
          updatedAt: Timestamp.now(),
        });
      }
    }
  }
}

export async function deleteStore(id: string) {
  const tasksSnap = await getDocs(query(collection(db(), "tasks"), where("storeId", "==", id)));
  for (const taskDoc of tasksSnap.docs) { await deleteDoc(taskDoc.ref); }
  const commentsSnap = await getDocs(query(collection(db(), "comments"), where("storeId", "==", id)));
  for (const commentDoc of commentsSnap.docs) { await deleteDoc(commentDoc.ref); }
  await deleteDoc(doc(db(), "stores", id));
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
      idealStartDate: toDate(data.idealStartDate || data.startDate || data.deadline),
      idealEndDate: toDate(data.idealEndDate || data.idealDeadline || data.deadline),
      startDate: toDate(data.startDate || data.deadline),
      deadline: toDate(data.deadline),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Task;
  });
}

export async function getAllTasks(): Promise<Task[]> {
  const snap = await getDocs(collection(db(), "tasks"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      idealStartDate: toDate(data.idealStartDate || data.startDate || data.deadline),
      idealEndDate: toDate(data.idealEndDate || data.idealDeadline || data.deadline),
      startDate: toDate(data.startDate || data.deadline),
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
    idealStartDate: Timestamp.fromDate(data.idealStartDate || data.startDate || data.deadline),
    idealEndDate: Timestamp.fromDate(data.idealEndDate || data.deadline),
    startDate: Timestamp.fromDate(data.startDate || data.deadline),
    deadline: Timestamp.fromDate(data.deadline),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<Task>) {
  const update: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
  if (data.deadline) update.deadline = Timestamp.fromDate(data.deadline);
  if (data.startDate) update.startDate = Timestamp.fromDate(data.startDate);
  if (data.idealStartDate) update.idealStartDate = Timestamp.fromDate(data.idealStartDate);
  if (data.idealEndDate) update.idealEndDate = Timestamp.fromDate(data.idealEndDate);
  await updateDoc(doc(db(), "tasks", id), update);
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await updateDoc(doc(db(), "tasks", id), { status, updatedAt: Timestamp.now() });
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db(), "tasks", id));
}

export async function updateTaskSortOrders(taskIds: string[]) {
  const batch = writeBatch(db());
  taskIds.forEach((id, index) => {
    batch.update(doc(db(), "tasks", id), { sortOrder: index });
  });
  await batch.commit();
}

export async function updateTaskShowOnGantt(taskId: string, showOnGantt: boolean) {
  await updateDoc(doc(db(), "tasks", taskId), { showOnGantt });
}

// --- Store初期タスク生成（ブランド別テンプレートから） ---
export async function generateTasksFromTemplates(
  storeId: string,
  brandId: string,
  phaseDates: Record<string, { date: string | null }>,
  assigneeId: string,
  assigneeName: string,
) {
  const templates = await getTaskTemplatesByBrand(brandId);
  for (const tpl of templates) {
    const basePhaseCode = tpl.basePhaseCode || "01";
    const baseDateStr = phaseDates[basePhaseCode]?.date;
    const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();

    const idealStartDate = new Date(baseDate);
    idealStartDate.setDate(idealStartDate.getDate() + (tpl.startDaysFromBase || 0));
    const idealEndDate = new Date(baseDate);
    idealEndDate.setDate(idealEndDate.getDate() + (tpl.endDaysFromBase || 0));

    await createTask({
      taskCode: tpl.taskCode || "",
      storeId,
      templateId: tpl.id,
      name: tpl.name,
      phase: tpl.phase,
      basePhaseCode,
      idealStartDate,
      idealEndDate,
      startDate: new Date(idealStartDate),
      deadline: new Date(idealEndDate),
      deadlineDescription: tpl.deadlineDescription,
      assigneeId,
      assigneeName,
      details: tpl.details,
      ownerMessage: tpl.ownerMessage,
      ownerResources: tpl.ownerResources,
      status: "not_started",
      visibleToOwner: tpl.ownerSensitivity === "safe" ? tpl.visibleToOwner : false,
      ownerSensitivity: tpl.ownerSensitivity || "safe",
      dependsOn: tpl.dependsOn || "",
      isManual: false,
    });
  }
}

// --- 重複チェック ---
export interface DuplicateCheckResult {
  newTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[];
  duplicates: { incoming: Omit<Task, "id" | "createdAt" | "updatedAt">; existing: Task }[];
}

export async function checkDuplicateTasks(
  storeId: string,
  incomingTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[],
): Promise<DuplicateCheckResult> {
  const existingTasks = await getTasksByStore(storeId);
  const newTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[] = [];
  const duplicates: DuplicateCheckResult["duplicates"] = [];
  for (const incoming of incomingTasks) {
    // taskCodeがあればtaskCodeで一致、なければタスク名+フェーズで一致
    const match = incoming.taskCode
      ? existingTasks.find((existing) => existing.taskCode === incoming.taskCode)
      : existingTasks.find(
          (existing) => existing.name.trim() === incoming.name.trim() && existing.phase.trim() === incoming.phase.trim(),
        );
    if (match) { duplicates.push({ incoming, existing: match }); } else { newTasks.push(incoming); }
  }
  return { newTasks, duplicates };
}

export async function bulkCreateTasks(tasks: Omit<Task, "id" | "createdAt" | "updatedAt">[]) {
  const results: string[] = [];
  for (const task of tasks) { const id = await createTask(task); results.push(id); }
  return results;
}

// --- Comments ---
export async function getCommentsByTask(taskId: string): Promise<TaskComment[]> {
  const snap = await getDocs(
    query(collection(db(), "comments"), where("taskId", "==", taskId), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as TaskComment;
  });
}

export async function createComment(data: Omit<TaskComment, "id" | "createdAt">) {
  const ref = await addDoc(collection(db(), "comments"), { ...data, createdAt: Timestamp.now() });
  return ref.id;
}

export async function deleteComment(id: string) {
  await deleteDoc(doc(db(), "comments", id));
}

export async function getCommentCountsByStore(storeId: string): Promise<Record<string, number>> {
  const snap = await getDocs(query(collection(db(), "comments"), where("storeId", "==", storeId)));
  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => { const taskId = d.data().taskId; counts[taskId] = (counts[taskId] || 0) + 1; });
  return counts;
}

export async function getCommentsByStore(storeId: string): Promise<TaskComment[]> {
  const snap = await getDocs(
    query(collection(db(), "comments"), where("storeId", "==", storeId), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as TaskComment;
  });
}
