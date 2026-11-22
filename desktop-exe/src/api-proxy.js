"use strict";

const http = require("node:http");
const https = require("node:https");

function proxyFailure(error) {
  const code = error.code ?? "UPSTREAM_CONNECTION_FAILED";
  let message = "无法连接线上服务，请检查网络后重试";
  if (code === "CERT_HAS_EXPIRED") {
    message = "线上服务的 HTTPS 证书已过期，请联系管理员续期后重试";
  } else if (code === "CERT_NOT_YET_VALID") {
    message = "线上服务的 HTTPS 证书尚未生效，请检查本机日期时间或联系管理员";
  } else if (/CERT|TLS|SELF_SIGNED|VERIFY_LEAF/.test(code)) {
    message = "线上服务的 HTTPS 证书验证失败，请联系管理员检查证书配置";
  } else if (code === "ETIMEDOUT") {
    message = "线上服务响应超时，请检查网络或稍后重试";
  } else if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    message = "无法解析线上服务域名，请检查网络或 DNS 设置后重试";
  }
  return { status: code === "ETIMEDOUT" ? 504 : 502, message, code };
}

function createApiProxy({ remoteApi, agent, idleTimeoutMs = 15 * 60 * 1000, logger = console }) {
  const base = new URL(remoteApi);
  if (base.protocol !== "https:") throw new Error("线上 API 必须使用 HTTPS");

  return http.createServer((request, response) => {
    const fail = (error) => {
      logger.error("Desktop API proxy failed", error.code ?? error.message);
      if (response.destroyed) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const { status, ...body } = proxyFailure(error);
      response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(body));
    };

    try {
      const target = new URL(`${remoteApi.replace(/\/$/, "")}${request.url ?? "/"}`);
      if (target.origin !== base.origin) throw new Error("拒绝转发到未授权的服务地址");
      const headers = {};
      for (const name of [
        "accept", "accept-encoding", "authorization", "content-type", "content-length",
        "if-modified-since", "if-none-match", "range", "content-range",
      ]) {
        const value = request.headers[name];
        if (typeof value === "string") headers[name] = value;
      }

      const upstream = https.request(target, {
        method: request.method,
        headers,
        agent,
        timeout: idleTimeoutMs,
      }, (upstreamResponse) => {
        response.statusCode = upstreamResponse.statusCode ?? 502;
        for (const [name, value] of Object.entries(upstreamResponse.headers)) {
          if (value !== undefined && !["connection", "transfer-encoding"].includes(name.toLowerCase())) {
            response.setHeader(name, value);
          }
        }
        upstreamResponse.on("error", () => response.destroy());
        upstreamResponse.pipe(response);
      });
      upstream.setTimeout(idleTimeoutMs, () => {
        const error = new Error("线上服务响应超时");
        error.code = "ETIMEDOUT";
        upstream.destroy(error);
      });
      upstream.on("error", fail);
      request.on("aborted", () => upstream.destroy());
      response.on("close", () => {
        if (!response.writableFinished) upstream.destroy();
      });
      request.pipe(upstream);
    } catch (error) {
      fail(error);
    }
  });
}

module.exports = { createApiProxy };
