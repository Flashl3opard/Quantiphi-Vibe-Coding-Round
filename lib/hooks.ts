import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTaskInput, type UpdateTaskInput } from "./api-client";
import type { MemberWithUser, ProjectWithMembers, TaskWithAssignee, User } from "./types";

export function useProjects(initialData?: ProjectWithMembers[]) {
  return useQuery({ queryKey: ["projects"], queryFn: api.listProjects, initialData });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUsers(initialData?: User[]) {
  return useQuery({ queryKey: ["users"], queryFn: api.listUsers, initialData });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useIdentify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.identify,
    onSuccess: (user) => {
      qc.setQueryData<User[]>(["users"], (prev) => {
        if (!prev) return prev;
        return prev.some((u) => u.id === user.id)
          ? prev.map((u) => (u.id === user.id ? user : u))
          : [...prev, user];
      });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useMembers(projectId: string, initialData?: MemberWithUser[]) {
  return useQuery({
    queryKey: ["members", projectId],
    queryFn: () => api.listMembers(projectId),
    enabled: Boolean(projectId),
    initialData,
  });
}

export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.addMember(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeMember(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] });
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function tasksKey(projectId: string) {
  return ["tasks", projectId] as const;
}

export function useTasks(projectId: string, initialData?: TaskWithAssignee[]) {
  return useQuery({
    queryKey: tasksKey(projectId),
    queryFn: () => api.listTasks(projectId),
    enabled: Boolean(projectId),
    initialData,
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => api.createTask(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(projectId) }),
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskInput }) =>
      api.updateTask(taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(projectId) }),
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(projectId) }),
  });
}

/**
 * Drag-and-drop move: optimistically reorders the local cache so the card
 * snaps into place immediately, then confirms with the server and rolls
 * back on failure.
 */
export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      status,
      position,
    }: {
      taskId: string;
      status: string;
      position: number;
    }) => api.updateTask(taskId, { status, position }),
    onMutate: async ({ taskId, status, position }) => {
      await qc.cancelQueries({ queryKey: tasksKey(projectId) });
      const previous = qc.getQueryData<TaskWithAssignee[]>(tasksKey(projectId));
      if (previous) {
        const moving = previous.find((t) => t.id === taskId);
        if (moving) {
          const rest = previous.filter((t) => t.id !== taskId);
          const destination = rest
            .filter((t) => t.status === status)
            .sort((a, b) => a.position - b.position);
          const others = rest.filter((t) => t.status !== status);
          const clampedIndex = Math.max(0, Math.min(position, destination.length));
          destination.splice(clampedIndex, 0, {
            ...moving,
            status: status as TaskWithAssignee["status"],
          });
          const renumbered = destination.map((t, i) => ({ ...t, position: i }));
          qc.setQueryData(tasksKey(projectId), [...others, ...renumbered]);
        }
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(tasksKey(projectId), context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKey(projectId) }),
  });
}
