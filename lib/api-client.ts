import type {
  MemberWithUser,
  ProjectWithMembers,
  TaskWithAssignee,
  User,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload?.error && typeof payload.error === "string"
        ? payload.error
        : payload?.error
          ? JSON.stringify(payload.error)
          : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  priority?: string;
  status?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & { position?: number };

export const api = {
  listProjects: () => request<ProjectWithMembers[]>("/api/projects"),
  createProject: (data: { name: string; description?: string; ownerId: string }) =>
    request<ProjectWithMembers>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getProject: (projectId: string) =>
    request<ProjectWithMembers>(`/api/projects/${projectId}`),

  listMembers: (projectId: string) =>
    request<MemberWithUser[]>(`/api/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string) =>
    request<MemberWithUser>(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  removeMember: (projectId: string, userId: string) =>
    request<{ ok: true }>(`/api/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    }),

  listTasks: (projectId: string) =>
    request<TaskWithAssignee[]>(`/api/projects/${projectId}/tasks`),
  createTask: (projectId: string, data: CreateTaskInput) =>
    request<TaskWithAssignee>(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTask: (taskId: string, data: UpdateTaskInput) =>
    request<TaskWithAssignee>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTask: (taskId: string) =>
    request<{ ok: true }>(`/api/tasks/${taskId}`, { method: "DELETE" }),

  listUsers: () => request<User[]>("/api/users"),
  createUser: (data: { name: string; email: string }) =>
    request<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  identify: (data: { name: string; email: string }) =>
    request<User>("/api/users/identify", { method: "POST", body: JSON.stringify(data) }),
};
