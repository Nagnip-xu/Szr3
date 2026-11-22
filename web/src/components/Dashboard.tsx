"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectBootstrap } from "@/components/layout/ProjectBootstrap";
import { StudioView } from "@/components/views/StudioView";
import { WorkspaceView } from "@/components/views/WorkspaceView";
import { ProfileView } from "@/components/views/ProfileView";
import { useProject } from "@/context/ProjectContext";

export function Dashboard() {
  const { activeTab } = useProject();

  const content = {
    studio: <StudioView />,
    workspace: <WorkspaceView />,
    profile: <ProfileView />,
  }[activeTab];

  return (
    <>
      <ProjectBootstrap />
      <AppShell>{content}</AppShell>
    </>
  );
}
