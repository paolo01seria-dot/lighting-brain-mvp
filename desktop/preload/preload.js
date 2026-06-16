"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lightingBrainDesktop", {
  audio: {
    listSources: () => ipcRenderer.invoke("desktop:audio:list-sources"),
    getStatus: () => ipcRenderer.invoke("desktop:audio:get-status"),
    startMock: () => ipcRenderer.invoke("desktop:audio:start-mock"),
    stop: () => ipcRenderer.invoke("desktop:audio:stop"),
  },
});
