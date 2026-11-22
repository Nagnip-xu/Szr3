"use client";

import { useCallback, useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import type { AvatarOption, VoiceOption } from "@/lib/types/project";
import { AVATAR_OPTIONS, VOICE_OPTIONS } from "@/lib/api/mock-data";

interface WorkflowOptions {
  avatars: (AvatarOption & { referenceVideo?: string })[];
  voices: VoiceOption[];
}

let cache: WorkflowOptions | null = null;
let inFlight: Promise<WorkflowOptions> | null = null;
const listeners = new Set<(data: WorkflowOptions) => void>();

async function fetchWorkflowOptions(): Promise<WorkflowOptions> {
  const data = await http<WorkflowOptions>("/workflow/options");
  return {
    avatars: data.avatars.map((a) => ({
      id: a.id,
      name: a.name,
      preview: a.preview,
      previewVideo: a.previewVideo,
      tag: a.tag,
      referenceVideo: a.referenceVideo,
    })),
    voices: data.voices,
  };
}

export function refreshWorkflowOptions() {
  if (inFlight) return inFlight;
  inFlight = fetchWorkflowOptions()
    .then((data) => {
      cache = data;
      listeners.forEach((fn) => fn(data));
      return data;
    })
    .catch(() => cache ?? { avatars: AVATAR_OPTIONS, voices: VOICE_OPTIONS })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useWorkflowOptions() {
  const [options, setOptions] = useState<WorkflowOptions>(
    cache ?? { avatars: AVATAR_OPTIONS, voices: VOICE_OPTIONS },
  );

  const applyOptions = useCallback((data: WorkflowOptions) => {
    setOptions(data);
  }, []);
  const reload = useCallback(() => {
    void refreshWorkflowOptions().then(setOptions);
  }, []);

  useEffect(() => {
    listeners.add(applyOptions);
    if (!cache) {
      void refreshWorkflowOptions().then(setOptions);
    }
    return () => {
      listeners.delete(applyOptions);
    };
  }, [applyOptions]);

  return { ...options, refresh: reload };
}
