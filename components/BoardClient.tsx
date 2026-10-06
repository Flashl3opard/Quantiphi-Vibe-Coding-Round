"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, UserPlus } from "lucide-react";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { TeamList } from "./TeamList";
import { PriorityFilter } from "./PriorityFilter";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { TaskDialog, type TaskFormValues } from "./TaskDialog";
import { AddMemberDialog } from "./AddMemberDialog";
import { useCurrentUserId } from "@/lib/current-user-context";
import {
  useAddMember,
  useCreateTask,
  useCreateUser,
  useDeleteTask,
  useMembers,
  useMoveTask,
  useProjects,
  useRemoveMember,
  useTasks,
  useUpdateTask,
  useUsers,
} from "@/lib/hooks";
import {
  STATUS_COLUMNS,
  type MemberWithUser,
  type ProjectWithMembers,
  type TaskWithAssignee,
  type User,
} from "@/lib/types";

function groupByStatus(tasks: TaskWithAssignee[]) {
  const groups: Record<string, TaskWithAssignee[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
    groups[task.status]?.push(task);
  }
  return groups;
}

function formValuesToPayload(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    priority: values.priority,
    status: values.status,
    dueDate: values.dueDate || null,
    assigneeId: values.assigneeId || null,
  };
}

export function BoardClient({
  project,
  initialTasks,
  initialUsers,
  initialProjects,
}: {
  project: ProjectWithMembers;
  initialTasks: TaskWithAssignee[];
  initialUsers: User[];
  initialProjects: ProjectWithMembers[];
}) {
  const projectId = project.id;
  const { currentUserId } = useCurrentUserId();

  const { data: tasks = [] } = useTasks(projectId, initialTasks);
  const { data: members = [] } = useMembers(projectId, project.members) as {
    data: MemberWithUser[];
  };
  const { data: users = [] } = useUsers(initialUsers);
  const { data: projects = [] } = useProjects(initialProjects);

  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const moveTask = useMoveTask(projectId);
  const addMember = useAddMember(projectId);
  const removeMember = useRemoveMember(projectId);
  const createUser = useCreateUser();

  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: TaskWithAssignee | null; status: string }>({
    open: false,
    task: null,
    status: "TODO",
  });
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);

  const isCurrentUserMember = currentUserId
    ? members.some((m) => m.userId === currentUserId)
    : false;

  const groupedAll = useMemo(() => groupByStatus(tasks), [tasks]);
  const dragDisabled = priorityFilter !== "ALL" || myTasksOnly;
  const visibleGroups = useMemo(() => {
    if (!dragDisabled) return groupedAll;
    const filtered: Record<string, TaskWithAssignee[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const status of Object.keys(groupedAll)) {
      filtered[status] = groupedAll[status].filter((t) => {
        if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
        if (myTasksOnly && t.assigneeId !== currentUserId) return false;
        return true;
      });
    }
    return filtered;
  }, [groupedAll, dragDisabled, priorityFilter, myTasksOnly, currentUserId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    const overTask = tasks.find((t) => t.id === overId);
    const destStatus = overTask ? overTask.status : overId;
    if (!STATUS_COLUMNS.some((c) => c.id === destStatus)) return;

    const siblings = groupedAll[destStatus].filter((t) => t.id !== activeId);
    const destIndex = overTask ? siblings.findIndex((t) => t.id === overId) : siblings.length;
    if (destStatus === task.status && destIndex === siblings.findIndex((t) => t.id === activeId)) {
      return;
    }

    moveTask.mutate({ taskId: activeId, status: destStatus, position: Math.max(destIndex, 0) });
  }

  function openCreateDialog(status: string) {
    setTaskDialog({ open: true, task: null, status });
  }

  function openEditDialog(task: TaskWithAssignee) {
    setTaskDialog({ open: true, task, status: task.status });
  }

  function handleTaskSubmit(values: TaskFormValues) {
    const payload = formValuesToPayload(values);
    if (taskDialog.task) {
      updateTask.mutate(
        { taskId: taskDialog.task.id, data: payload },
        { onSuccess: () => setTaskDialog((d) => ({ ...d, open: false })) }
      );
    } else {
      createTask.mutate(payload, {
        onSuccess: () => setTaskDialog((d) => ({ ...d, open: false })),
      });
    }
  }

  function handleDeleteTask(task: TaskWithAssignee) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    deleteTask.mutate(task.id);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-indigo-600 px-2 py-1 text-sm font-bold text-white">
              TB
            </span>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <ProjectSwitcher projects={projects} currentId={projectId} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openCreateDialog("TODO")}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Plus size={14} />
              New task
            </button>
            <ThemeToggle />
            <UserMenu users={users} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {currentUserId && !isCurrentUserMember && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
            <span>You&apos;re not a member of this project yet, so you can&apos;t be assigned tasks here.</span>
            <button
              type="button"
              onClick={() => currentUserId && addMember.mutate(currentUserId)}
              disabled={addMember.isPending}
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <UserPlus size={12} />
              Join project
            </button>
          </div>
        )}

        <TeamList
          members={members}
          tasks={tasks}
          currentUserId={currentUserId}
          onAddMember={() => setMemberDialogOpen(true)}
          onRemoveMember={(userId) => removeMember.mutate(userId)}
          canRemove
        />

        <div className="flex flex-wrap items-center gap-3">
          <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
          {currentUserId && (
            <button
              type="button"
              onClick={() => setMyTasksOnly((v) => !v)}
              className={
                myTasksOnly
                  ? "rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white"
                  : "rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }
            >
              My tasks
            </button>
          )}
          {dragDisabled && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear filters to drag and reorder tasks.
            </p>
          )}
        </div>

        <DndContext
          id="taskboard-dnd"
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-x-auto sm:flex-row">
            {STATUS_COLUMNS.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                label={col.label}
                tasks={visibleGroups[col.id] ?? []}
                dragDisabled={dragDisabled}
                onAddTask={() => openCreateDialog(col.id)}
                onEditTask={openEditDialog}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} dragDisabled onEdit={() => {}} onDelete={() => {}} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {taskDialog.open && (
          <TaskDialog
            key={taskDialog.task?.id ?? `new-${taskDialog.status}`}
            open
            onClose={() => setTaskDialog((d) => ({ ...d, open: false }))}
            task={taskDialog.task}
            defaultStatus={taskDialog.status}
            defaultAssigneeId={isCurrentUserMember ? currentUserId : null}
            members={members}
            submitting={createTask.isPending || updateTask.isPending}
            onSubmit={handleTaskSubmit}
            onDelete={
              taskDialog.task
                ? () => {
                    if (!taskDialog.task) return;
                    handleDeleteTask(taskDialog.task);
                    setTaskDialog((d) => ({ ...d, open: false }));
                  }
                : undefined
            }
          />
        )}

        <AddMemberDialog
          open={memberDialogOpen}
          onClose={() => setMemberDialogOpen(false)}
          users={users}
          members={members}
          submitting={addMember.isPending || createUser.isPending}
          onAddExisting={(userId) => addMember.mutate(userId, { onSuccess: () => setMemberDialogOpen(false) })}
          onCreateAndAdd={(data) =>
            createUser.mutate(data, {
              onSuccess: (user) =>
                addMember.mutate(user.id, { onSuccess: () => setMemberDialogOpen(false) }),
            })
          }
        />
      </div>
    </div>
  );
}
