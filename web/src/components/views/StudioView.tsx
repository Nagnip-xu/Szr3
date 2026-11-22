"use client";

import { ProjectBanner } from "@/components/layout/ProjectBanner";
import { PolishLivePreview } from "@/components/studio/PolishLivePreview";
import { ExtractPanel } from "@/components/workflow/ExtractPanel";
import { RewritePanel } from "@/components/workflow/RewritePanel";
import { AudioPanel } from "@/components/workflow/AudioPanel";
import { VideoPanel } from "@/components/workflow/VideoPanel";
import { SubtitlePanel } from "@/components/workflow/SubtitlePanel";
import { BgmPanel } from "@/components/workflow/BgmPanel";
import { PipPanel } from "@/components/workflow/PipPanel";
import { TitlePanel } from "@/components/workflow/TitlePanel";
import { PublishView } from "@/components/views/PublishView";
import { Panel } from "@/components/ui/Panel";
import { useProject } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";
import { Check, Cpu, Eye, LayoutTemplate, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { pollRenderJob } from "@/lib/api/render-jobs";
import { findVideoTemplate, VIDEO_TEMPLATES, type VideoTemplate } from "@/lib/types/video-template";

const editTabs = [
  { id: "subtitle", label: "字幕" },
  { id: "bgm", label: "背景音乐" },
  { id: "pip", label: "画中画" },
] as const;
type EditTab = (typeof editTabs)[number]["id"];

function Completion({ label, ready }: { label: string; ready: boolean }) {
  return <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">{ready ? <Check className="size-3.5 text-[var(--success)]" /> : <span className="size-1.5 rounded-full bg-white/20" />}{label}</span>;
}

export function StudioView() {
  const { project, updateProject, showToast } = useProject();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>("subtitle");
  const previewMode = editTab === "pip" ? "pip" : editTab === "bgm" ? "bgm" : "subtitle";
  const selectedTemplate = findVideoTemplate(project.videoTemplateId);

  const applyTemplate = (template: VideoTemplate) => {
    if (template.id === "none") {
      updateProject({ videoTemplateId: template.id });
      setTemplateOpen(false);
      return;
    }
    updateProject({
      videoTemplateId: template.id,
      ...template.subtitle,
      ...template.bgm,
      pip: {
        ...template.pip,
        assetUrl: template.pip.enabled ? project.pip.assetUrl : null,
      },
    });
    setTemplateOpen(false);
  };

  const handleAutoArrange = async () => {
    if (!project.projectId) { showToast("请先在「创作空间」创建或打开项目"); return; }
    const videoUrl = project.processedVideoUrl ?? project.digitalHumanVideoUrl ?? project.parsedVideoUrl;
    if (!videoUrl) { showToast("请先生成数字人视频或解析视频链接"); return; }
    if (project.pip.enabled && !project.pip.assetUrl) { showToast("当前模板需要画中画素材，请先在「画中画」中上传素材"); return; }
    setAutoRunning(true);
    try {
      const res = await api.renderFinal({
        projectId: project.projectId,
        videoUrl,
        subtitleSegments: project.subtitleSegments,
        style: { font: project.subtitleFont, size: project.subtitleSize, bottom: project.subtitleBottom, color: project.subtitleColor, strokeColor: project.subtitleStrokeColor },
        bgmUrl: project.bgmUrl,
        bgmVolume: project.bgmVolume,
        useBgm: project.useBgm,
        addAiWatermark: project.addAiWatermark,
        audioUrl: project.audioUrl,
        script: project.rewrittenScript || project.originalScript,
        pip: project.pip.enabled ? project.pip : undefined,
        coverUrl: project.coverUrl,
        publishWithCover: project.publishWithCover && !!project.coverUrl,
      });
      if (!res.success || !res.data?.jobId) { showToast(res.message ?? "自动编排提交失败"); return; }
      showToast(`已按「${selectedTemplate.name}」开始自动编排…`);
      const job = await pollRenderJob(res.data.jobId, { timeoutMs: 600_000 });
      if (job.status === "failed") { showToast(job.error ?? "自动编排失败"); return; }
      if (job.videoUrl) updateProject({ finalVideoUrl: job.videoUrl, processedVideoUrl: job.videoUrl });
      showToast("自动编排完成，可在第 7 部分预览并下载");
    } catch (err) { showToast(err instanceof Error ? err.message : "自动编排失败"); }
    finally { setAutoRunning(false); }
  };

  return (
    <div className="studio-shell animate-fade-up space-y-4">
      <ProjectBanner />
      <header className="studio-toolbar">
        <div className="min-w-0"><h1 className="text-xl font-semibold text-[var(--foreground)]">视频生产工作台</h1><p className="mt-1 text-xs text-[var(--text-muted)]">所有模块同屏协作，按列完成文案、配音、数字人与剪辑。</p></div>
        <div className="flex flex-wrap gap-3"><Completion label="文案" ready={!!(project.originalScript || project.rewrittenScript)} /><Completion label="配音" ready={!!project.audioUrl} /><Completion label="数字人" ready={!!project.digitalHumanVideoUrl} /><Completion label="成片" ready={!!project.finalVideoUrl} /></div>
      </header>

      <section className="studio-grid">
        <div className="studio-column studio-column-left"><ExtractPanel /><RewritePanel /><TitlePanel step={6} /></div>
        <div className="studio-column studio-column-middle"><AudioPanel /><VideoPanel /></div>
        <div className="studio-column studio-column-right">
          <Panel step={5} title="视频剪辑" badge="同屏预览">
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]"><Eye className="size-3.5 text-[var(--accent-bright)]" />视频源：自动使用上一阶段数字人视频</div>
            <div className="rounded-[var(--radius-md)] border border-[var(--accent-ring)] bg-[var(--accent-dim)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-xs font-semibold text-[var(--foreground)]">模板编排</p><p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">当前使用「{selectedTemplate.name} · {selectedTemplate.tag}」，会组合字幕、BGM、画中画与封面提交成片渲染，不包含 GPU 数字人生成。</p></div>
                <WandSparkles className="size-4 shrink-0 text-[var(--accent-bright)]" />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="outline" size="sm" fullWidth onClick={() => setTemplateOpen(true)}><LayoutTemplate className="size-3.5" />选择模板</Button>
                <Button variant="primary" fullWidth size="sm" onClick={handleAutoArrange} loading={autoRunning}><Cpu className="size-3.5" />按模板自动编排</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">{editTabs.map((tab) => <button type="button" key={tab.id} onClick={() => setEditTab(tab.id)} className={cn("rounded-[var(--radius-sm)] border px-2 py-2 text-xs", editTab === tab.id ? "border-[var(--accent-ring)] bg-[var(--accent-dim)] text-[var(--accent-bright)]" : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/[0.03]")}>{tab.label}</button>)}</div>
            {editTab === "subtitle" && <SubtitlePanel />}
            {editTab === "bgm" && <BgmPanel />}
            {editTab === "pip" && <PipPanel />}
            <div className="studio-preview"><div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"><Eye className="size-3.5" />实时预览</div><PolishLivePreview mode={previewMode} compact /></div>
          </Panel>
        </div>
      </section>

      <Dialog open={templateOpen} onClose={() => setTemplateOpen(false)} showClose ariaLabel="选择视频模板" className="max-w-3xl p-5 sm:p-6">
        <div className="pr-8"><h2 className="text-base font-semibold text-[var(--foreground)]">选择视频模板</h2><p className="mt-1 text-xs text-[var(--text-muted)]">选择后会立即套用字幕、BGM 和画中画参数；素材仍可在下方继续调整。</p></div>
        <div className="mt-5 grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {VIDEO_TEMPLATES.map((template) => <button key={template.id} type="button" onClick={() => applyTemplate(template)} className={cn("group overflow-hidden rounded-[var(--radius-md)] border text-left transition", selectedTemplate.id === template.id ? "border-[var(--accent-bright)] bg-[var(--accent-dim)]" : "border-[var(--border-subtle)] bg-[var(--surface-muted)] hover:border-[var(--border-strong)]")}>
            <div className={cn("relative aspect-[9/13] overflow-hidden", template.previewClass)}><div className="absolute inset-x-3 top-4 text-center text-[10px] font-semibold leading-tight" style={{ color: template.accent }}>星轨短视频<br />{template.name}</div><div className="absolute inset-x-3 bottom-5 rounded bg-black/30 px-2 py-1 text-center text-[9px] font-medium text-white/90">字幕样式预览</div>{selectedTemplate.id === template.id && <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-900">已选择</span>}</div>
            <div className="p-2.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[var(--foreground)]">{template.name}</span><span className="shrink-0 text-[10px] text-[var(--text-muted)]">{template.tag}</span></div><p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-muted)]">{template.description}</p>{template.requiresPipAsset && <p className="mt-1.5 text-[10px] text-[#f3c777]">需先上传画中画素材</p>}</div>
          </button>)}
        </div>
      </Dialog>

      <Panel step={7} title="视频发布" badge="导出成片"><section className="studio-bottom"><PublishView /></section></Panel>
    </div>
  );
}
