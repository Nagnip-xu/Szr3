"use client";

import { api } from "@/lib/api/client";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Textarea } from "@/components/ui/FormControls";
import { Hash } from "lucide-react";

export function TitlePanel({ step = 6 }: { step?: number }) {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();

  const handleGenerate = async () => {
    const script = project.rewrittenScript || project.originalScript;
    if (!script.trim()) {
      showToast("请先生成口播文案");
      return;
    }
    setLoading("title", true);
    const res = await api.generateTitle({ script });
    setLoading("title", false);
    if (res.success && res.data) {
      updateProject({
        title: res.data.title,
        hashtags: res.data.hashtags,
      });
      showToast("标题与话题生成成功");
    } else {
      showToast(res.message ?? "生成失败");
    }
  };

  return (
    <Panel step={step} title="标题生成" completed={!!project.title}>
      <Button
        variant="primary"
        fullWidth
        onClick={handleGenerate}
        loading={loading.title}
      >
        <Hash className="size-4" />
        生成标题与话题
      </Button>

      <Textarea
        placeholder="标题与 #话题标签 将显示在这里..."
        value={
          project.title
            ? `${project.title}\n\n${project.hashtags}`
            : ""
        }
        onChange={(e) => {
          const lines = e.target.value.split("\n\n");
          updateProject({
            title: lines[0] ?? "",
            hashtags: lines[1] ?? "",
          });
        }}
        className="min-h-[100px]"
      />
    </Panel>
  );
}
