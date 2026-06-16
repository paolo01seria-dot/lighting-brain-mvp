"use strict";

const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { AudioCaptureManager } = require("./audio/AudioCaptureManager");
const { MockAudioCaptureDriver } = require("./audio/drivers/MockAudioCaptureDriver");
const { BlackHoleLegacyDriver } = require("./audio/drivers/BlackHoleLegacyDriver");
const { MacCoreAudioTapDriver } = require("./audio/drivers/MacCoreAudioTapDriver");
const { WindowsWasapiLoopbackDriver } = require("./audio/drivers/WindowsWasapiLoopbackDriver");
const { MicrophoneFallbackDriver } = require("./audio/drivers/MicrophoneFallbackDriver");
const { AUDIO_SOURCE_TYPES } = require("./audio/sourceTypes");
const { DesktopProcessManager } = require("./DesktopProcessManager");
const { LegacyAudioRouteManager } = require("./LegacyAudioRouteManager");

const singleInstanceLock = app.requestSingleInstanceLock();
const projectRoot = path.join(__dirname, "../..");
let processManager = null;
let legacyAudioRouteManager = null;
let cleanupInProgress = false;
let cleanupComplete = false;
let mainWindow = null;
let dashboardWindow = null;

if (!singleInstanceLock) {
  console.log("Second instance blocked before startup; quitting.");
  app.quit();
}

function createSystemOutputDriver() {
  if (process.platform === "win32") return new WindowsWasapiLoopbackDriver();
  return new MacCoreAudioTapDriver();
}

const audioManager = new AudioCaptureManager({
  drivers: [
    new MockAudioCaptureDriver(),
    new BlackHoleLegacyDriver(),
    createSystemOutputDriver(),
    new MicrophoneFallbackDriver(),
  ],
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: "Lighting Brain",
    backgroundColor: "#101416",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    quitAfterCleanup();
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function registerIpc() {
  ipcMain.handle("desktop:legacy-audio:get-status", async () => legacyAudioRouteManager.getStatus());
  ipcMain.handle("desktop:legacy-audio:refresh-status", async () => legacyAudioRouteManager.refreshStatus());
  ipcMain.handle("desktop:legacy-audio:open-audio-midi-setup", async () => {
    await legacyAudioRouteManager.openAudioMidiSetup();
    return legacyAudioRouteManager.refreshStatus();
  });
  ipcMain.handle("desktop:legacy-audio:force-enable", async () => legacyAudioRouteManager.forceEnableLegacyRouting());
  ipcMain.handle("desktop:legacy-audio:restore-previous-output", async () => legacyAudioRouteManager.restorePreviousOutput({ reason: "manual restore" }));

  ipcMain.handle("desktop:audio:list-sources", async () => audioManager.listSources());
  ipcMain.handle("desktop:audio:get-status", async () => audioManager.getStatus());
  ipcMain.handle("desktop:audio:start-mock", async () => {
    await audioManager.start(AUDIO_SOURCE_TYPES.MOCK, {});
    return audioManager.getStatus();
  });
  ipcMain.handle("desktop:audio:stop", async () => {
    await audioManager.stop();
    return audioManager.getStatus();
  });

  ipcMain.handle("desktop:system:start", async () => processManager.startSystem());
  ipcMain.handle("desktop:system:stop", async () => processManager.stopSystem());
  ipcMain.handle("desktop:system:get-status", async () => processManager.getSystemStatus());
  ipcMain.handle("desktop:system:get-logs", async () => processManager.getLogs());
  ipcMain.handle("desktop:system:open-dashboard", async () => {
    const dashboard = await processManager.canOpenDashboard();
    if (!dashboard.ok) {
      throw new Error(dashboard.error);
    }
    openDashboardWindow(dashboard.url);
    return processManager.dashboardUrl;
  });
  ipcMain.handle("desktop:system:open-dashboard-external", async () => {
    await shell.openExternal(processManager.dashboardUrl);
    return processManager.dashboardUrl;
  });
  ipcMain.handle("desktop:system:force-cleanup-ports", async (_event, options = {}) => processManager.forceCleanupPorts(options));
  ipcMain.handle("desktop:system:clean-stale-project-services", async () => processManager.cleanStaleProjectServices());
}

if (singleInstanceLock) {
  app.on("second-instance", () => {
    console.log("Second instance blocked; focusing existing window");
    if (processManager) {
      processManager.addLog("system", "Second instance blocked; focusing existing window");
    }
    focusExistingMainWindow();
  });

  app.whenReady().then(() => {
    legacyAudioRouteManager = new LegacyAudioRouteManager({
      statePath: path.join(app.getPath("userData"), "legacy-audio-route.json"),
      logger: (serviceId, message) => {
        if (processManager) processManager.addLog(serviceId, message);
      },
    });
    processManager = new DesktopProcessManager({
      projectRoot,
      legacyAudioRouteManager,
    });
    registerIpc();
    legacyAudioRouteManager.refreshStatus().catch(() => {});
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        focusExistingMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  quitAfterCleanup();
});

app.on("before-quit", (event) => {
  if (cleanupComplete) return;
  event.preventDefault();
  quitAfterCleanup();
});

process.on("SIGINT", () => {
  quitAfterCleanup();
});

process.on("SIGTERM", () => {
  quitAfterCleanup();
});

function openDashboardWindow(url) {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus();
    dashboardWindow.loadURL(url);
    return dashboardWindow;
  }
  dashboardWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: "Lighting Brain Dashboard",
    backgroundColor: "#101416",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
  dashboardWindow.loadURL(url);
  return dashboardWindow;
}

function focusExistingMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (dashboardWindow.isMinimized()) {
      dashboardWindow.restore();
    }
    dashboardWindow.show();
    dashboardWindow.focus();
  }
}

function quitAfterCleanup() {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
  Promise.allSettled([
    audioManager.stop(),
    processManager ? processManager.stopSystem() : Promise.resolve(),
  ]).finally(() => {
    cleanupComplete = true;
    app.quit();
  });
}
