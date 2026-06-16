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
const { MacAudioRouteManager } = require("./MacAudioRouteManager");

const singleInstanceLock = app.requestSingleInstanceLock();
const projectRoot = path.join(__dirname, "../..");
let processManager = null;
let macAudioRouteManager = null;
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
  ipcMain.handle("desktop:legacy-audio:get-status", async () => macAudioRouteManager.getStatus());
  ipcMain.handle("desktop:legacy-audio:refresh-status", async () => macAudioRouteManager.refreshStatus());
  ipcMain.handle("desktop:legacy-audio:open-audio-midi-setup", async () => {
    await macAudioRouteManager.openAudioMidiSetup();
    return macAudioRouteManager.refreshStatus();
  });
  ipcMain.handle("desktop:legacy-audio:force-enable", async () => macAudioRouteManager.forceEnableLegacyRouting());
  ipcMain.handle("desktop:legacy-audio:restore-previous-output", async () => macAudioRouteManager.restorePreviousOutput({ reason: "manual restore" }));

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
  ipcMain.handle("desktop:system:stop", async () => {
    closeDashboardWindows("stop system");
    const status = await processManager.stopSystem();
    closeDashboardWindows("stop system cleanup");
    return status;
  });
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
    validateManagedWindows();
    if (processManager) {
      notifySystemSyncState();
      processManager.refreshAfterSecondInstance()
        .catch((error) => {
          processManager.addLog("system", `Second-instance refresh failed: ${error.message}`);
        })
        .finally(() => {
          validateManagedWindows();
          notifySystemSyncState();
        });
    }
  });

  app.whenReady().then(() => {
    macAudioRouteManager = new MacAudioRouteManager({
      statePath: path.join(app.getPath("userData"), "legacy-audio-route.json"),
      logger: (serviceId, message) => {
        if (processManager) processManager.addLog(serviceId, message);
      },
    });
    processManager = new DesktopProcessManager({
      projectRoot,
      legacyAudioRouteManager: macAudioRouteManager,
    });
    registerIpc();
    macAudioRouteManager.refreshStatus().catch(() => {});
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
  validateManagedWindows();
  const existingDashboard = findDashboardWindow();
  if (existingDashboard) {
    dashboardWindow = existingDashboard;
    bringWindowToFront(existingDashboard);
    processManager.addLog("system", "Dashboard already open; focusing existing window");
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
  dashboardWindow.once("ready-to-show", () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      bringWindowToFront(dashboardWindow);
    }
  });
  return dashboardWindow;
}

function closeDashboardWindows(reason) {
  validateManagedWindows();
  const dashboardWindows = findDashboardWindows();
  if (!dashboardWindows.length) {
    dashboardWindow = null;
    return;
  }
  dashboardWindow = null;
  for (const windowToClose of dashboardWindows) {
    if (windowToClose.isDestroyed()) continue;
    if (processManager) {
      processManager.addLog("system", `Closing dashboard window (${reason})`);
    }
    windowToClose.close();
  }
}

function closeManagedWindows(reason) {
  closeDashboardWindows(reason);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners("closed");
    mainWindow.close();
    mainWindow = null;
  }
}

function bringWindowToFront(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  app.focus({ steal: true });
  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }
  targetWindow.show();
  if (typeof targetWindow.moveTop === "function") {
    targetWindow.moveTop();
  }
  targetWindow.focus();
  targetWindow.setAlwaysOnTop(true);
  targetWindow.setAlwaysOnTop(false);
}

function findDashboardWindow() {
  return findDashboardWindows()[0] || null;
}

function findDashboardWindows() {
  return BrowserWindow.getAllWindows().filter((candidate) => {
    if (!candidate || candidate.isDestroyed()) return false;
    if (candidate === mainWindow) return false;
    if (candidate === dashboardWindow) return true;
    const url = candidate.webContents.getURL();
    const title = candidate.getTitle();
    return title === "Lighting Brain Dashboard" || isDashboardUrl(url);
  });
}

function isDashboardUrl(url) {
  return /^https?:\/\/(127\.0\.0\.1|localhost):8788\/web\/?/u.test(url);
}

function focusExistingMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    bringWindowToFront(mainWindow);
    return;
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    bringWindowToFront(dashboardWindow);
  }
}

function validateManagedWindows() {
  if (mainWindow && mainWindow.isDestroyed()) {
    mainWindow = null;
  }
  if (dashboardWindow && dashboardWindow.isDestroyed()) {
    dashboardWindow = null;
  }
  if (!dashboardWindow) {
    dashboardWindow = findDashboardWindow();
  }
}

function notifySystemSyncState() {
  validateManagedWindows();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop:system:sync-state", processManager.getSystemStatus());
  }
}

function quitAfterCleanup() {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
  closeDashboardWindows("app cleanup");
  Promise.allSettled([
    audioManager.stop(),
    processManager ? processManager.stopSystem({ force: true }) : Promise.resolve(),
  ]).finally(() => {
    closeManagedWindows("app exit");
    cleanupComplete = true;
    app.exit(0);
  });
}
