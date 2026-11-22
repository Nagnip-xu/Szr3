"use client";

import { api, complianceApi } from "@/lib/api/client";
import { uploadProjectFile } from "@/lib/api/upload";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { Checkbox, Select, Slider } from "@/components/ui/FormControls";
import { useWorkflowOptions } from "@/hooks/useWorkflowOptions";
import { withAuthToken } from "@/lib/api/asset-url";
import { useCallback, useState } from "react";

export function AudioPanel() {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();
  const { voices, refresh } = useWorkflowOptions();
  const [voiceRefUrl, setVoiceRefUrl] = useState<string | null>(null);
  const [voiceRefName, setVoiceRefName] = useState("我的音色");
  const [trainingVoice, setTrainingVoice] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [voiceConsentId, setVoiceConsentId] = useState<string | null>(null);
  const [playbackRequestId] = useState(() => Date.now());
  // Older projects used a stable filename. Version the request so an already
  // open browser does not keep a stale or incomplete media response cached.
  const audioSource = project.audioUrl
    ? `${project.audioUrl}${project.audioUrl.includes("?") ? "&" : "?"}v=${project.audioDuration ?? 0}&playback=${playbackRequestId}`
    : null;
  const playableUrl = withAuthToken(audioSource);
  const attachAudio = useCallback((node: HTMLAudioElement | null) => {
    if (node) node.load();
  }, []);

  const handleGenerate = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    setLoading("audio", true);
    const res = await api.generateAudio({
      text: project.rewrittenScript || project.originalScript,
      voiceId: project.voiceId,
      rate: project.speechRate,
      projectId: project.projectId,
    });
    setLoading("audio", false);
    if (res.success && res.data) {
      updateProject({
        audioUrl: res.data.audioUrl,
        audioDuration: res.data.duration,
        subtitleSegments: res.data.subtitleSegments ?? [],
        durationMs:
          res.data.durationMs ??
          Math.round((res.data.duration ?? 0) * 1000),
      });
      showToast(
        res.data.subtitleSegments?.length
          ? `音频已生成，并已同步 ${res.data.subtitleSegments.length} 条字幕时间轴`
          : res.data.model
            ? `音频已生成并保存 · ${res.data.voice ?? "HeyGem TTS"}`
            : "音频生成成功",
      );
    } else {
      showToast(res.message ?? "生成失败");
    }
  };

  const handleUploadVoiceRef = async (file: File) => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    if (!voiceConsent) {
      showToast("请先确认您已获得声音克隆授权");
      return;
    }
    setLoading("audio", true);
    try {
      const consent = await complianceApi.createConsent({ projectId: project.projectId, type: "voice_clone", subjectName: voiceRefName.trim() || undefined });
      const uploaded = await uploadProjectFile(project.projectId, file);
      setVoiceRefUrl(uploaded.publicUrl);
      setVoiceConsentId(consent.id);
      showToast("参考音频已上传，可点击训练音色");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "上传失败");
    } finally {
      setLoading("audio", false);
    }
  };

  const handleTrainVoice = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    if (!voiceRefUrl || !voiceConsentId) {
      showToast("请先上传 10–30 秒参考音频");
      return;
    }
    setTrainingVoice(true);
    const res = await api.trainCustomVoice({
      projectId: project.projectId,
      audioUrl: voiceRefUrl,
      consentId: voiceConsentId,
      name: voiceRefName.trim() || "我的音色",
    });
    setTrainingVoice(false);
    if (res.success && res.data) {
      updateProject({ voiceId: res.data.id });
      refresh();
      showToast(`音色「${res.data.name}」训练成功，已自动选中`);
    } else {
      showToast(res.message ?? "音色训练失败");
    }
  };

  return (
    <Panel step={3} title="声音克隆" completed={!!project.audioUrl}>
      <Select
        label="音色选择"
        value={project.voiceId}
        onChange={(e) => updateProject({ voiceId: e.target.value })}
        options={voices.map((v) => ({
          value: v.id,
          label: `${v.name} · ${v.tag}`,
        }))}
      />

      <div className="space-y-2 rounded-lg border border-white/[0.08] bg-[#0a0f18]/40 p-3">
        <p className="text-xs font-medium text-[#9eb0c8]">上传我的音色</p>
        <p className="text-[11px] leading-relaxed text-[#5a6a82]">
          上传 10–30 秒清晰人声（wav/mp3），系统将克隆并在 HeyGem GPU 上训练。
        </p>
        <input
          type="text"
          value={voiceRefName}
          onChange={(e) => setVoiceRefName(e.target.value)}
          placeholder="音色名称"
          className="w-full rounded-md border border-white/10 bg-[#141c2b] px-3 py-2 text-xs text-[#c8d4e4] outline-none focus:border-[#3b82f6]/50"
        />
        <Checkbox
          id="voice-clone-consent"
          checked={voiceConsent}
          onChange={setVoiceConsent}
          label="我确认已获得该声音主体的明确授权，并同意按数据保留规则处理素材。"
        />
        <FileUploadButton
          label={voiceRefUrl ? "重新上传参考音频" : "上传参考音频（10–30 秒）"}
          accept="audio/*,.wav,.mp3,.m4a"
          disabled={loading.audio || trainingVoice}
          onSelect={handleUploadVoiceRef}
        />
        {voiceRefUrl && (
          <p className="truncate text-[11px] text-[#5a6a82]">已上传，可开始训练</p>
        )}
        <Button
          variant="secondary"
          fullWidth
          onClick={handleTrainVoice}
          loading={trainingVoice}
          disabled={!voiceRefUrl || loading.audio}
        >
          训练并添加音色
        </Button>
      </div>

      <Slider
        label="语速调节"
        value={project.speechRate}
        min={0.5}
        max={2}
        step={0.1}
        onChange={(v) => updateProject({ speechRate: v })}
        format={(v) => v.toFixed(1)}
      />

      <Button
        variant="primary"
        fullWidth
        onClick={handleGenerate}
        loading={loading.audio}
      >
        生成音频
      </Button>

      <div className="rounded-lg border border-white/[0.08] bg-[#0a0f18]/60 p-3">
        {playableUrl ? (
          <audio
            key={playableUrl}
            ref={attachAudio}
            controls
            preload="auto"
            src={playableUrl}
            className="h-9 w-full accent-[#4f7cff]"
            onError={() => showToast("音频加载失败，请重新生成后再试")}
          >
            当前浏览器不支持音频播放。
          </audio>
        ) : (
          <p className="text-center text-xs text-[#5a6a82]">生成音频后可在此直接播放</p>
        )}
      </div>
    </Panel>
  );
}
