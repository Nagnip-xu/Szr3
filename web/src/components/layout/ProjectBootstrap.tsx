"use client";

import { projectsApi, workspaceApi } from "@/lib/api/client";
import { defaultProjectState } from "@/lib/types/project";
import { useProject } from "@/context/ProjectContext";
import { useEffect, useRef } from "react";

/** 登录后自动恢复最近项目，若无项目则创建默认项目 */
export function ProjectBootstrap() {
  const { project, loadProject, updateProject } = useProject();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current || project.projectId) return;
    bootstrapped.current = true;

    (async () => {
      try {
        const ws = await workspaceApi.get();
        const latest = ws.recentProjects[0];
        if (latest) {
          await loadProject(latest.id);
          updateProject({ projectName: latest.name });
          return;
        }

        const created = await projectsApi.create(
          "默认项目",
          JSON.stringify({ ...defaultProjectState, projectName: "默认项目" }),
        );
        updateProject({
          projectId: created.id,
          projectName: created.name ?? "默认项目",
        });
      } catch {
        /* 用户可手动在创作空间创建 */
      }
    })();
  }, [project.projectId, loadProject, updateProject]);

  return null;
}
