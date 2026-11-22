import { createHash, randomBytes } from 'crypto';

export interface IsteroVideoData {
  title?: string;
  cover?: string;
  url?: string;
  [key: string]: unknown;
}

export interface IsteroParseResult {
  title: string;
  cover: string;
  videoUrl: string;
  requestId?: string;
  providerName?: string;
  elapsedTime?: number;
}

export class IsteroApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
  }
}

/**
 * 起零数据 · 全平台短视频解析 V2
 * @see https://api.istero.com/service/doc/video-parser-v2
 */
export class IsteroVideoParser {
  private readonly endpoint =
    'https://api.istero.com/resource/v2/video/analysis';

  constructor(
    private readonly token: string,
    private readonly appSecret?: string,
  ) {}

  async parse(url: string): Promise<IsteroParseResult> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(8).toString('hex');

    if (this.appSecret) {
      headers['X-Timestamp'] = timestamp;
      headers['X-Nonce'] = nonce;
      headers['X-Signature'] = this.buildSignature(url, timestamp, nonce);
    }

    const requestUrl = new URL(this.endpoint);
    requestUrl.searchParams.set('url', url);

    const res = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(60_000),
    });

    const body = (await res.json().catch(() => ({}))) as {
      code?: number;
      message?: string;
      data?: IsteroVideoData;
      requestID?: string;
      providerName?: string;
      elapsedTime?: number;
    };

    const code = body.code ?? res.status;

    if (code !== 200) {
      throw new IsteroApiError(
        this.mapErrorMessage(code, body.message),
        code,
      );
    }

    const data = body.data ?? {};
    const videoUrl = String(data.url ?? '');
    if (!videoUrl) {
      throw new IsteroApiError('解析成功但未返回视频地址', 400);
    }

    return {
      title: String(data.title ?? ''),
      cover: String(data.cover ?? ''),
      videoUrl,
      requestId: body.requestID,
      providerName: body.providerName,
      elapsedTime: body.elapsedTime,
    };
  }

  /** 动态签名：SHA256(Token + AppSecret + Timestamp + Nonce + sortedParams) */
  private buildSignature(url: string, timestamp: string, nonce: string) {
    const params = `url=${url}`;
    const payload = `${this.token}${this.appSecret}${timestamp}${nonce}${params}`;
    return createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  private mapErrorMessage(code: number, message?: string) {
    const fallback: Record<number, string> = {
      202: '账户余额不足，请前往起零数据控制台充值',
      302: '视频解析服务维护中',
      400: '解析失败，请检查链接是否有效',
      403: 'Token 鉴权失败，请检查 ISTERO_API_TOKEN',
      404: '接口不存在',
      429: '调用过于频繁，QPS 限制 2 次/秒',
      500: '解析服务内部错误',
      502: '账号被封锁或冻结',
    };
    return message || fallback[code] || `解析失败 (${code})`;
  }
}
