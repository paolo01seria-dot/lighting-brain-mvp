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
    startQlcBridge: () => ipcRenderer.invoke("desktop:system:start-qlc-bridge"),
    stopSystem: () => ipcRenderer.invoke("desktop:system:stop"),
    getSystemStatus: () => ipcRenderer.invoke("desktop:system:get-status"),
    getLogs: () => ipcRenderer.invoke("desktop:system:get-logs"),
    openDashboard: () => ipcRenderer.invoke("desktop:system:open-dashboard"),
    openLightSetup: () => ipcRenderer.invoke("desktop:system:open-light-setup"),
    openDashboardExternal: () => ipcRenderer.invoke("desktop:system:open-dashboard-external"),
    openDmxDashboard: () => ipcRenderer.invoke("desktop:system:open-dmx-dashboard"),
    forceCleanupPorts: (options = {}) => ipcRenderer.invoke("desktop:system:force-cleanup-ports", options),
    cleanStaleProjectServices: () => ipcRenderer.invoke("desktop:system:clean-stale-project-services"),
    onSyncState: (callback) => {
      const handler = (_event, status) => callback(status);
      ipcRenderer.on("desktop:system:sync-state", handler);
      return () => ipcRenderer.removeListener("desktop:system:sync-state", handler);
    },
  },
  audio: {
    listSources: () => ipcRenderer.invoke("desktop:audio:list-sources"),
    getStatus: () => ipcRenderer.invoke("desktop:audio:get-status"),
    startMock: () => ipcRenderer.invoke("desktop:audio:start-mock"),
    stop: () => ipcRenderer.invoke("desktop:audio:stop"),
  },
  lightSetup: {
    getStatus: () => ipcRenderer.invoke("desktop:light-setup:get-status"),
    refresh: () => ipcRenderer.invoke("desktop:light-setup:refresh"),
    setCurrent: (setupPath) => ipcRenderer.invoke("desktop:light-setup:set-current", setupPath),
    validate: (setupPath) => ipcRenderer.invoke("desktop:light-setup:validate", setupPath),
  },
  dmx: {
    getSnapshot: () => ipcRenderer.invoke("desktop:dmx:get-snapshot"),
    setManualArmed: (armed) => ipcRenderer.invoke("desktop:dmx:set-manual-armed", armed),
    setChannel: (channel, value) => ipcRenderer.invoke("desktop:dmx:set-channel", { channel, value }),
    blackout: () => ipcRenderer.invoke("desktop:dmx:blackout"),
    mirrorQlcWeb: (payload) => ipcRenderer.invoke("desktop:dmx:mirror-qlc-web", payload),
    onSnapshot: (callback) => {
      const handler = (_event, snapshot) => callback(snapshot);
      ipcRenderer.on("desktop:dmx:snapshot", handler);
      return () => ipcRenderer.removeListener("desktop:dmx:snapshot", handler);
    },
  },
});
