"use strict";

const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell, session } = require("electron");
const { spawn } = require("node:child_process");
const nodeNet = require("node:net");
const { createApiProxy } = require("./api-proxy");
const path = require("node:path");
const fs = require("node:fs");
const { HttpsProxyAgent } = require("https-proxy-agent");

const LOOPBACK = "127.0.0.1";
const API_PROXY_PORT = 43124;
const REMOTE_API = "https://xinggui.xin/api";
const API_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const START_TIMEOUT_MS = 45_000;
let frontendProcess = null;
let apiProxyServer = null;
let apiHttpsAgent;
let mainWindow = null;
let shuttingDown = false;

function credentialStorePath() {
  return path.join(app.getPath("userData"), "remembered-login.json");
}

function readRememberedCredentials() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const stored = JSON.parse(fs.readFileSync(credentialStorePath(), "utf8"));
    if (typeof stored.email !== "string" || typeof stored.password !== "string") return null;
    return {
      email: stored.email,
      password: safeStorage.decryptString(Buffer.from(stored.password, "base64")),
    };
  } catch {
    return null;
  }
}

function saveRememberedCredentials(_event, value) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("当前系统无法提供加密凭据存储");
  }
  if (!value || typeof value.email !== "string" || typeof value.password !== "string") {
    throw new Error("保存的登录信息无效");
  }
  fs.writeFileSync(
    credentialStorePath(),
    JSON.stringify({
      email: value.email.trim(),
      password: safeStorage.encryptString(value.password).toString("base64"),
    }),
    "utf8",
  );
}

function clearRememberedCredentials() {
  fs.rmSync(credentialStorePath(), { force: true });
}

function frontendRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "frontend")
    : path.join(__dirname, "..", "build", "runtime");
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = nodeNet.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, LOOPBACK, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function startApiProxy() {
  return new Promise((resolve, reject) => {
    apiProxyServer = createApiProxy({
      remoteApi: REMOTE_API,
      agent: apiHttpsAgent,
      idleTimeoutMs: API_IDLE_TIMEOUT_MS,
    });
    apiProxyServer.once("error", reject);
    apiProxyServer.listen(API_PROXY_PORT, LOOPBACK, resolve);
  });
}

async function configureApiProxyAgent() {
  try {
    const proxyConfig = await session.defaultSession.resolveProxy(REMOTE_API);
    const directive = proxyConfig
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => /^(HTTPS?|PROXY)\s+/i.test(entry));

    if (!directive) {
      console.info("Desktop API proxy: direct connection");
      return;
    }

    const match = directive.match(/^(HTTPS?|PROXY)\s+(.+)$/i);
    const protocol = match?.[1].toUpperCase() === "HTTPS" ? "https" : "http";
    const address = match?.[2].trim();
    if (!address) return;

    apiHttpsAgent = new HttpsProxyAgent(`${protocol}://${address}`);
    console.info(`Desktop API proxy: system proxy enabled (${protocol})`);
  } catch (error) {
    console.warn(
      "Desktop API proxy resolution failed; trying a direct connection",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function startFrontend(port) {
  const root = frontendRoot();
  const serverFile = path.join(root, "server.js");
  if (!fs.existsSync(serverFile)) {
    throw new Error(`桌面前端未构建：${serverFile}`);
  }

  const logsDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const log = fs.openSync(path.join(logsDir, "frontend.log"), "a");

  frontendProcess = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: LOOPBACK,
      PORT: String(port),
      NODE_PATH: path.join(root, "vendor"),
    },
    stdio: ["ignore", log, log],
    windowsHide: true,
  });

  frontendProcess.once("exit", (code) => {
    frontendProcess = null;
    if (!shuttingDown && code !== 0) {
      dialog.showErrorBox("星轨数字人启动失败", `本地界面服务已退出（代码 ${code ?? "unknown"}）。`);
      app.quit();
    }
  });
}

async function waitUntilReady(url) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`本地界面服务启动超时：${lastError}`);
}

function configureDownloads() {
  const downloadDir = path.join(app.getPath("downloads"), "星轨数字人");
  session.defaultSession.on("will-download", (_event, item) => {
    fs.mkdirSync(downloadDir, { recursive: true });
    item.setSavePath(path.join(downloadDir, path.basename(item.getFilename())));
  });
}

function createWindow(url) {
  const appOrigin = new URL(url).origin;
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#f7f8fa",
    autoHideMenuBar: true,
    title: "星轨数字人",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    try {
      if (new URL(target).origin === appOrigin) return { action: "allow" };
    } catch {}
    shell.openExternal(target);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, target) => {
    let isLocal = false;
    try {
      isLocal = new URL(target).origin === appOrigin;
    } catch {}
    if (!isLocal) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadURL(url);
}

async function boot() {
  ipcMain.handle("credentials:get", readRememberedCredentials);
  ipcMain.handle("credentials:save", saveRememberedCredentials);
  ipcMain.handle("credentials:clear", clearRememberedCredentials);
  configureDownloads();
  await configureApiProxyAgent();
  await startApiProxy();
  const port = await reservePort();
  const url = `http://${LOOPBACK}:${port}`;
  startFrontend(port);
  await waitUntilReady(`${url}/login`);
  createWindow(url);
}

function stopFrontend() {
  if (!frontendProcess) return;
  frontendProcess.kill();
  frontendProcess = null;
}

function stopApiProxy() {
  if (!apiProxyServer) return;
  apiProxyServer.close();
  apiProxyServer = null;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(boot).catch((error) => {
    dialog.showErrorBox("星轨数字人启动失败", error instanceof Error ? error.message : String(error));
    app.quit();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    shuttingDown = true;
    stopFrontend();
    stopApiProxy();
  });
}
