"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("szr3Desktop", Object.freeze({
  platform: process.platform,
  isDesktop: true,
  credentials: Object.freeze({
    get: () => ipcRenderer.invoke("credentials:get"),
    save: (value) => ipcRenderer.invoke("credentials:save", value),
    clear: () => ipcRenderer.invoke("credentials:clear"),
  }),
}));
