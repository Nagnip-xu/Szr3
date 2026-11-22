"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProjectState, TabId, WorkflowStepId } from "@/lib/types/project";
import { defaultProjectState } from "@/lib/types/project";
import { projectsApi } from "@/lib/api/client";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ProjectContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  workflowStep: WorkflowStepId;
  setWorkflowStep: (step: WorkflowStepId) => void;
  project: ProjectState;
  updateProject: (patch: Partial<ProjectState>) => void;
  loadProject: (projectId: string) => Promise<void>;
  resetProject: () => void;
  saveStatus: SaveStatus;
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;
  toast: string | null;
  showToast: (message: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const SAVE_KEYS: (keyof ProjectState)[] = [
  "sourceUrl",
  "parsedTitle",
  "parsedCover",
  "parsedVideoUrl",
  "originalScript",
  "subtitleSegments",
  "durationMs",
  "asrModel",
  "hasWordTimestamps",
  "rewrittenScript",
  "rewriteMode",
  "customPrompt",
  "voiceId",
  "speechRate",
  "audioUrl",
  "audioDuration",
  "avatarId",
  "referenceVideoUrl",
  "digitalHumanVideoUrl",
  "digitalHumanAvatarId",
  "subtitleFont",
  "subtitleSize",
  "subtitleBottom",
  "subtitleColor",
  "subtitleStrokeColor",
  "bgmVolume",
  "useBgm",
  "customBgm",
  "title",
  "hashtags",
  "coverText",
  "coverFont",
  "coverFontSize",
  "coverColor",
  "coverHighlightColor",
  "coverPosition",
  "useCustomCover",
  "noCover",
  "aiCoverText",
  "addAiWatermark",
  "publishWithCover",
  "pip",
  "finalVideoUrl",
  "bgmUrl",
  "processedVideoUrl",
  "coverUrl",
  "videoTemplateId",
  "projectName",
];

function buildPersistPayload(project: ProjectState) {
  const payload: Record<string, unknown> = { projectId: project.projectId };
  for (const key of SAVE_KEYS) {
    payload[key] = project[key];
  }
  return JSON.stringify(payload);
}

function draftKey(projectId: string) {
  return `szr3-project-draft:${projectId}`;
}

function readLocalDraft(projectId: string): Partial<ProjectState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    return raw ? (JSON.parse(raw) as Partial<ProjectState>) : null;
  } catch {
    return null;
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>("studio");
  const [workflowStep, setWorkflowStep] = useState<WorkflowStepId>("script");
  const [project, setProject] = useState<ProjectState>(defaultProjectState);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoadingState] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);
  const lastSaved = useRef("");

  const updateProject = useCallback((patch: Partial<ProjectState>) => {
    setProject((prev) => ({ ...prev, ...patch }));
  }, []);

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    skipSave.current = true;
    try {
      const data = await projectsApi.get(projectId);
      const state = (data.state ?? {}) as Partial<ProjectState>;
      const localDraft = readLocalDraft(data.id);
      const merged = {
        ...defaultProjectState,
        ...state,
        // Recover a draft if the previous API save was interrupted.
        ...(localDraft ?? {}),
        projectId: data.id,
        projectName: data.name ?? state.projectName ?? "未命名项目",
      };
      if (
        merged.avatarId &&
        !merged.avatarId.startsWith("custom-") &&
        !merged.avatarId.startsWith("avatar-")
      ) {
        merged.avatarId = "";
        merged.referenceVideoUrl = null;
      }
      setProject(merged);
      lastSaved.current = buildPersistPayload(merged);
      setSaveStatus("saved");
    } catch {
      setProject({ ...defaultProjectState, projectId });
      setSaveStatus("error");
    } finally {
      setTimeout(() => {
        skipSave.current = false;
      }, 500);
    }
  }, []);

  const resetProject = useCallback(() => {
    skipSave.current = true;
    setProject({ ...defaultProjectState });
    lastSaved.current = "";
    setSaveStatus("idle");
    setTimeout(() => {
      skipSave.current = false;
    }, 300);
  }, []);

  const persistSnapshot = useMemo(
    () => buildPersistPayload(project),
    [project],
  );

  useEffect(() => {
    if (skipSave.current || !project.projectId) return;
    if (persistSnapshot === lastSaved.current) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        draftKey(project.projectId),
        persistSnapshot,
      );
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");

    saveTimer.current = setTimeout(async () => {
      try {
        const trimmedName = project.projectName?.trim();
        await projectsApi.update(project.projectId!, {
          stateJson: persistSnapshot,
          ...(trimmedName ? { name: trimmedName } : {}),
        });
        lastSaved.current = persistSnapshot;
        window.localStorage.removeItem(draftKey(project.projectId!));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [persistSnapshot, project.projectId, project.projectName]);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      workflowStep,
      setWorkflowStep,
      project,
      updateProject,
      loadProject,
      resetProject,
      saveStatus,
      loading,
      setLoading,
      toast,
      showToast,
    }),
    [
      activeTab,
      workflowStep,
      project,
      updateProject,
      loadProject,
      resetProject,
      saveStatus,
      loading,
      setLoading,
      toast,
      showToast,
    ],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
