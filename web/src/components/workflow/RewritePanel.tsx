"use client";

import { api } from "@/lib/api/client";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Input, RadioGroup, Textarea } from "@/components/ui/FormControls";
import { ShieldCheck, Wand2 } from "lucide-react";
import { useState } from "react";

export function RewritePanel() {
  const { project, updateProject, loading, setLoading, showToast } = useProject();
  const [review, setReview] = useState<Awaited<ReturnType<typeof api.reviewScript>>["data"]>(undefined);
  const source = project.originalScript;
  const rewrite = async () => { if (!source.trim()) { showToast("请先提取或输入文案"); return; } setLoading("rewrite", true); const res = await api.rewriteScript({ script: source, mode: project.rewriteMode, customPrompt: project.customPrompt }); setLoading("rewrite", false); if (res.success && res.data) { updateProject({ rewrittenScript: res.data.script, subtitleSegments: [] }); showToast("文案改写完成，请重新生成配音以同步字幕"); } else showToast(res.message ?? "改写失败"); };
  const inspect = async () => { const script = project.rewrittenScript || source; if (!script.trim()) { showToast("请先输入文案"); return; } setLoading("review", true); const res = await api.reviewScript(script); setLoading("review", false); if (res.success && res.data) setReview(res.data); else showToast(res.message ?? "审查失败"); };
  return <Panel step={2} title="改写文案" completed={!!project.rewrittenScript}>
    <RadioGroup name="rewrite-mode" value={project.rewriteMode} onChange={(v) => updateProject({ rewriteMode: v as "auto" | "custom" })} options={[{ value: "auto", label: "自动仿写" }, { value: "custom", label: "自定义指令" }]} />
    {project.rewriteMode === "custom" && <Input placeholder="输入改写指令" value={project.customPrompt} onChange={(e) => updateProject({ customPrompt: e.target.value })} />}
    <div className="grid grid-cols-2 gap-2"><Button variant="primary" onClick={rewrite} loading={loading.rewrite}><Wand2 className="size-4" />一键改写</Button><Button variant="outline" onClick={inspect} loading={loading.review}><ShieldCheck className="size-4" />AI 审查</Button></div>
    {review && <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]"><p className="font-medium text-[var(--foreground)]">{review.summary}</p>{review.findings.map((item) => <p key={item.term} className="mt-1">{item.term} → {item.replacement}</p>)}{!!review.findings.length && <button type="button" onClick={() => updateProject({ rewrittenScript: review.optimized })} className="mt-2 text-[var(--accent-bright)] hover:underline">应用替换优化</button>}</div>}
    <Textarea label="改写内容" value={project.rewrittenScript} placeholder="改写结果将在这里显示" onChange={(e) => updateProject({ rewrittenScript: e.target.value })} className="min-h-[220px]" />
  </Panel>;
}
