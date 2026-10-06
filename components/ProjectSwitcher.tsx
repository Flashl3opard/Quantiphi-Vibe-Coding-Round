"use client";

import { useRouter } from "next/navigation";
import type { ProjectWithMembers } from "@/lib/types";

export function ProjectSwitcher({
  projects,
  currentId,
}: {
  projects: ProjectWithMembers[];
  currentId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={currentId}
      onChange={(e) => router.push(`/board/${e.target.value}`)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
