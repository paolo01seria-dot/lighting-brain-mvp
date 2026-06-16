"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lightingBrainDesktop", {
  legacyAudio: {
    getStatus: () => ipcRenderer.invoke("desktop:legacy-audio:get-status"),
    refreshStatus: () => ipcRenderer.invoke("desktop:legacy-audio:refresh-status"),
    openAudioMidiSetup: () => ipcRenderer.invoke("desktop:legacy-audio:open-audio-midi-setup"),
    forceEnable: () => ipcRenderer.invoke("desktop:legacy-audio:force-enable"),
    restorePreviousOutput: () => ipcRenderer.invoke("desktop:legacy-audio:restore-previous-output"),
  },
  system: {
    startSystem: () => ipcRenderer.invoke("desktop:system:start"),
    stopSystem: () => ipcRenderer.invoke("desktop:system:stop"),
    getSystemStatus: () => ipcRenderer.invoke("desktop:system:get-status"),
    getLogs: () => ipcRenderer.invoke("desktop:system:get-logs"),
    openDashboard: () => ipcRenderer.invoke("desktop:system:open-dashboard"),
    openDashboardExternal: () => ipcRenderer.invoke("desktop:system:open-dashboard-external"),
    forceCleanupPorts: (options = {}) => ipcRenderer.invoke("desktop:system:force-cleanup-ports", options),
    cleanStaleProjectServices: () => ipcRenderer.invoke("desktop:system:clean-stale-project-services"),
  },
  audio: {
    listSources: () => ipcRenderer.invoke("desktop:audio:list-sources"),
    getStatus: () => ipcRenderer.invoke("desktop:audio:get-status"),
    startMock: () => ipcRenderer.invoke("desktop:audio:start-mock"),
    stop: () => ipcRenderer.invoke("desktop:audio:stop"),
  },
});
