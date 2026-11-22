import { Injectable } from '@nestjs/common';
import {
  ChatCompletionResult,
  ChatMessage,
  LlmApiError,
} from './llm.types';

const DEFAULT_REWRITE_SYSTEM = `你是企业短视频口播文案专家，擅长把爆款口播改写成适合数字人朗读的新版本。
要求：
1. 保留原意与卖点，换表达、换结构，避免抄袭
2. 口语化、节奏感强，适合 60–90 秒竖屏口播
3. 不要 markdown、不要标题编号、不要括号舞台指示
4. 直接输出改写后的口播正文`;

@Injectable()
export class DeepSeekLlmService {
  private get apiKey() {
    return process.env.SHUAIAPI_API_KEY?.trim() ?? '';
  }

  private get baseUrl() {
    return (
      process.env.SHUAIAPI_BASE_URL?.trim() ?? 'https://api.shuaiapi.com/v1'
    ).replace(/\/$/, '');
  }

  private get model() {
    return process.env.SHUAIAPI_LLM_MODEL?.trim() ?? 'deepseek-v4-flash';
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<ChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new LlmApiError('未配置 SHUAIAPI_API_KEY');
    }

    let status = 0;
    let body: {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    } = {};

    // Provider channels occasionally reject a request while being rebalanced.
    // Retrying these transient responses prevents a single failed attempt from
    // immediately breaking the user's rewrite flow.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: options?.maxTokens ?? 2048,
            temperature: options?.temperature ?? 0.7,
            stream: false,
          }),
          signal: controller.signal,
        });
        status = res.status;
        body = (await res.json().catch(() => ({}))) as typeof body;
      } catch (error) {
        status = 0;
        body = {
          error: {
            message:
              error instanceof Error ? error.message : '模型服务连接失败',
          },
        };
      } finally {
        clearTimeout(timeout);
      }

      const message = body.error?.message ?? '';
      const transient =
        status === 0 ||
        [408, 429, 500, 502, 503, 504].includes(status) ||
        /channel is temporarily unavailable/i.test(message);
      if ((status >= 200 && status < 300) || !transient || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }

    if (status < 200 || status >= 300) {
      if (status === 401) {
        throw new LlmApiError(
          '仿写服务鉴权失败：SHUAIAPI_API_KEY 无效或已过期。请在服务商控制台创建有效 Key，更新 api/.env 后重启 API。',
          status,
        );
      }
      if (/channel is temporarily unavailable/i.test(body.error?.message ?? '')) {
        throw new LlmApiError(
          '文案改写服务当前通道临时不可用，系统已自动重试 3 次仍未恢复。请稍后重试，或在模型服务商后台恢复该通道后再使用。',
          status,
        );
      }
      throw new LlmApiError(
        body.error?.message ?? `LLM 调用失败 (${status || '网络错误'})`,
        status || undefined,
      );
    }

    const choice = body.choices?.[0]?.message;
    const content =
      choice?.content?.trim() ||
      (choice as { reasoning_content?: string } | undefined)?.reasoning_content?.trim() ||
      '';
    if (!content) {
      throw new LlmApiError('LLM 未返回有效内容');
    }

    return {
      content,
      model: body.model ?? this.model,
      usage: body.usage
        ? {
            promptTokens: body.usage.prompt_tokens,
            completionTokens: body.usage.completion_tokens,
            totalTokens: body.usage.total_tokens,
          }
        : undefined,
    };
  }

  async rewriteScript(params: {
    script: string;
    mode: 'auto' | 'custom';
    customPrompt?: string;
  }): Promise<ChatCompletionResult> {
    const userPrompt =
      params.mode === 'custom' && params.customPrompt?.trim()
        ? `${params.customPrompt.trim()}\n\n原始口播文案：\n${params.script.trim()}`
        : `请改写以下口播文案，保持卖点但换全新表达：\n\n${params.script.trim()}`;

    return this.chat([
      { role: 'system', content: DEFAULT_REWRITE_SYSTEM },
      { role: 'user', content: userPrompt },
    ]);
  }

  async generateTitle(script: string): Promise<ChatCompletionResult> {
    return this.chat([
      {
        role: 'system',
        content:
          '你是短视频标题专家。根据口播文案生成 1 条吸引点击的标题（≤30字）和 4–6 个话题标签，格式：第一行标题，第二行以 # 开头的标签，用空格分隔。不要其他说明。',
      },
      { role: 'user', content: script.trim() },
    ], { maxTokens: 256, temperature: 0.8 });
  }
}
