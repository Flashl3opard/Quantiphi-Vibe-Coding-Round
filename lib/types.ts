import type { Task, User, Project, ProjectMember } from "@prisma/client";

export type { Task, User, Project, ProjectMember };
export type { TaskStatus, Priority, MemberRole } from "@prisma/client";

export type TaskWithAssignee = Task & { assignee: User | null };
export type MemberWithUser = ProjectMember & { user: User };
export type ProjectWithMembers = Project & {
  owner: User;
  members: MemberWithUser[];
  _count?: { tasks: number };
};

export const STATUS_COLUMNS = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
] as const;

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const WORKLOAD_LIMIT = 5;
