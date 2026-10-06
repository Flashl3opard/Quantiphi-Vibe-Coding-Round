import { z } from "zod";

export const taskStatusValues = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const priorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const memberRoleValues = ["OWNER", "MEMBER"] as const;

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  ownerId: z.string().min(1),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(memberRoleValues).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(priorityValues).optional(),
  status: z.enum(taskStatusValues).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(priorityValues).optional(),
  status: z.enum(taskStatusValues).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
  position: z.number().int().optional(),
});
