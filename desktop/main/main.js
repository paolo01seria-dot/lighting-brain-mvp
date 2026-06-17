"use strict";

const fs = require("node:fs");
const http = require("node:http");
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
const { DmxDashboardState } = require("./DmxDashboardState");
const { LightSetupManager } = require("./LightSetupManager");
const { DEFAULT_QLC_FIXTURE_MAP_PATH } = require("./DesktopProcessManager");

const singleInstanceLock = app.requestSingleInstanceLock();
const projectRoot = path.join(__dirname, "../..");
let processManager = null;
let macAudioRouteManager = null;
let cleanupInProgress = false;
let cleanupComplete = false;
let mainWindow = null;
let dashboardWindow = null;
let lightSetupWindow = null;
let dmxDashboardWindow = null;
let dmxDashboardState = null;
let lightSetupManager = null;
let dmxBridgePollTimer = null;
let dmxBridgePollInFlight = false;
const currentQlcFixtureMapPath = path.join(projectRoot, DEFAULT_QLC_FIXTURE_MAP_PATH);

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

  ipcMain.handle("desktop:system:start", async () => {
    if (shouldLoadSetupBeforeStart()) {
      loadSelectedLightSetupIntoOutput({ pushToRunningBridge: false });
    }
    return processManager.startSystem();
  });
  ipcMain.handle("desktop:system:start-qlc-bridge", async () => {
    const loaded = loadSelectedLightSetupIntoOutput({ pushToRunningBridge: false });
    broadcastDmxSnapshot();
    const status = await processManager.ensureQlcBridgeStarted();
    if (loaded?.fixtureMap) {
      await pushFixtureMapToQlcBridge(loaded.fixtureMap);
    }
    return status;
  });
  ipcMain.handle("desktop:system:stop", async () => {
    if (dmxDashboardState) {
      dmxDashboardState.blackout({ source: "stop_system_blackout", emitted: true });
      broadcastDmxSnapshot();
    }
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
  ipcMain.handle("desktop:system:open-light-setup", async () => {
    const dashboard = await processManager.canOpenDashboard();
    if (!dashboard.ok) {
      throw new Error(dashboard.error);
    }
    openLightSetupWindow(dashboard.url);
    return lightSetupUrl(dashboard.url);
  });
  ipcMain.handle("desktop:system:open-dashboard-external", async () => {
    await shell.openExternal(processManager.dashboardUrl);
    return processManager.dashboardUrl;
  });
  ipcMain.handle("desktop:system:open-dmx-dashboard", async () => {
    openDmxDashboardWindow();
    return true;
  });
  ipcMain.handle("desktop:system:force-cleanup-ports", async (_event, options = {}) => processManager.forceCleanupPorts(options));
  ipcMain.handle("desktop:system:clean-stale-project-services", async () => processManager.cleanStaleProjectServices());

  ipcMain.handle("desktop:light-setup:get-status", async () => lightSetupManager.refresh());
  ipcMain.handle("desktop:light-setup:refresh", async () => lightSetupManager.refresh());
  ipcMain.handle("desktop:light-setup:set-current", async (_event, setupPath) => {
    const result = lightSetupManager.setCurrentSetup(setupPath);
    if (result.ok) {
      loadSelectedLightSetupIntoOutput();
      broadcastDmxSnapshot();
    }
    return {
      ...result,
      status: result.status || lightSetupManager.refresh(),
    };
  });
  ipcMain.handle("desktop:light-setup:validate", async (_event, setupPath) => lightSetupManager.validateSetup(setupPath));

  ipcMain.handle("desktop:dmx:get-snapshot", async () => dmxDashboardState.snapshot());
  ipcMain.handle("desktop:dmx:set-manual-armed", async (_event, armed) => {
    const snapshot = dmxDashboardState.setManualArmed(armed);
    broadcastDmxSnapshot();
    return snapshot;
  });
  ipcMain.handle("desktop:dmx:set-channel", async (_event, payload = {}) => {
    const result = dmxDashboardState.manualSetChannel(payload.channel, payload.value);
    broadcastDmxSnapshot();
    return result;
  });
  ipcMain.handle("desktop:dmx:blackout", async () => {
    const result = dmxDashboardState.blackout({ source: "manual_dmx_dashboard_blackout", emitted: true });
    broadcastDmxSnapshot();
    return result;
  });
  ipcMain.handle("desktop:dmx:mirror-qlc-web", async (_event, payload = {}) => {
    const result = dmxDashboardState.applyQlcWebCommand(payload);
    broadcastDmxSnapshot();
    return result;
  });
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
    lightSetupManager = new LightSetupManager({
      projectRoot,
      logger: (serviceId, message) => {
        if (processManager) processManager.addLog(serviceId, message);
      },
    });
    dmxDashboardState = new DmxDashboardState({
      logger: (serviceId, message) => {
        if (processManager) processManager.addLog(serviceId, message);
      },
    });
    loadSelectedLightSetupIntoOutput();
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

function openLightSetupWindow(url) {
  validateManagedWindows();
  const existingLightSetup = findLightSetupWindow();
  if (existingLightSetup) {
    lightSetupWindow = existingLightSetup;
    bringWindowToFront(existingLightSetup);
    processManager.addLog("system", "Light Setup already open; focusing existing window");
    return lightSetupWindow;
  }
  lightSetupWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: "Light Setup",
    backgroundColor: "#101416",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  lightSetupWindow.on("closed", () => {
    lightSetupWindow = null;
  });
  lightSetupWindow.loadURL(lightSetupUrl(url));
  lightSetupWindow.once("ready-to-show", () => {
    if (lightSetupWindow && !lightSetupWindow.isDestroyed()) {
      bringWindowToFront(lightSetupWindow);
    }
  });
  return lightSetupWindow;
}

function closeLightSetupWindow(reason) {
  validateManagedWindows();
  if (!lightSetupWindow || lightSetupWindow.isDestroyed()) return;
  if (processManager) {
    processManager.addLog("system", `Closing Light Setup window (${reason})`);
  }
  lightSetupWindow.close();
  lightSetupWindow = null;
}

function openDmxDashboardWindow() {
  validateManagedWindows();
  const existingDmxDashboard = findDmxDashboardWindow();
  if (existingDmxDashboard) {
    dmxDashboardWindow = existingDmxDashboard;
    bringWindowToFront(existingDmxDashboard);
    processManager.addLog("system", "DMX Dashboard already open; focusing existing window");
    startDmxBridgePolling();
    return dmxDashboardWindow;
  }
  dmxDashboardWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    title: "DMX Dashboard",
    backgroundColor: "#101416",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  dmxDashboardWindow.on("closed", () => {
    dmxDashboardWindow = null;
    stopDmxBridgePolling();
  });
  dmxDashboardWindow.loadFile(path.join(__dirname, "../renderer/dmx-dashboard.html"));
  dmxDashboardWindow.once("ready-to-show", () => {
    if (dmxDashboardWindow && !dmxDashboardWindow.isDestroyed()) {
      bringWindowToFront(dmxDashboardWindow);
    }
  });
  startDmxBridgePolling();
  return dmxDashboardWindow;
}

function closeDmxDashboardWindow(reason) {
  validateManagedWindows();
  if (!dmxDashboardWindow || dmxDashboardWindow.isDestroyed()) return;
  if (processManager) {
    processManager.addLog("system", `Closing DMX Dashboard window (${reason})`);
  }
  dmxDashboardWindow.close();
  dmxDashboardWindow = null;
  stopDmxBridgePolling();
}

function closeManagedWindows(reason) {
  closeDashboardWindows(reason);
  closeLightSetupWindow(reason);
  closeDmxDashboardWindow(reason);
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
    if (candidate === lightSetupWindow) return false;
    if (candidate === dashboardWindow) return true;
    const url = candidate.webContents.getURL();
    const title = candidate.getTitle();
    return title === "Lighting Brain Dashboard" || isDashboardUrl(url);
  });
}

function findLightSetupWindow() {
  return BrowserWindow.getAllWindows().find((candidate) => {
    if (!candidate || candidate.isDestroyed()) return false;
    if (candidate === mainWindow || candidate === dashboardWindow || candidate === dmxDashboardWindow) return false;
    const url = candidate.webContents.getURL();
    return candidate === lightSetupWindow || candidate.getTitle() === "Light Setup" || isLightSetupUrl(url);
  }) || null;
}

function findDmxDashboardWindow() {
  return BrowserWindow.getAllWindows().find((candidate) => {
    if (!candidate || candidate.isDestroyed()) return false;
    if (candidate === mainWindow || candidate === dashboardWindow) return false;
    const url = candidate.webContents.getURL();
    return candidate === dmxDashboardWindow || candidate.getTitle() === "DMX Dashboard" || url.endsWith("/dmx-dashboard.html");
  }) || null;
}

function isDashboardUrl(url) {
  return /^https?:\/\/(127\.0\.0\.1|localhost):8788\/web\/?/u.test(url) && !isLightSetupUrl(url);
}

function isLightSetupUrl(url) {
  try {
    const parsed = new URL(url);
    return /^(127\.0\.0\.1|localhost)$/u.test(parsed.hostname)
      && parsed.port === "8788"
      && parsed.pathname.startsWith("/web/")
      && parsed.searchParams.get("mode") === "light_setup";
  } catch (_error) {
    return false;
  }
}

function lightSetupUrl(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("mode", "light_setup");
  return parsed.toString();
}

function focusExistingMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    bringWindowToFront(mainWindow);
    return;
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    bringWindowToFront(dashboardWindow);
    return;
  }
  if (lightSetupWindow && !lightSetupWindow.isDestroyed()) {
    bringWindowToFront(lightSetupWindow);
  }
}

function validateManagedWindows() {
  if (mainWindow && mainWindow.isDestroyed()) {
    mainWindow = null;
  }
  if (dashboardWindow && dashboardWindow.isDestroyed()) {
    dashboardWindow = null;
  }
  if (lightSetupWindow && lightSetupWindow.isDestroyed()) {
    lightSetupWindow = null;
  }
  if (dmxDashboardWindow && dmxDashboardWindow.isDestroyed()) {
    dmxDashboardWindow = null;
  }
  if (!dashboardWindow) {
    dashboardWindow = findDashboardWindow();
  }
  if (!lightSetupWindow) {
    lightSetupWindow = findLightSetupWindow();
  }
  if (!dmxDashboardWindow) {
    dmxDashboardWindow = findDmxDashboardWindow();
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
  stopDmxBridgePolling();
  if (dmxDashboardState) {
    dmxDashboardState.blackout({ source: "app_cleanup_blackout", emitted: true });
  }
  closeDashboardWindows("app cleanup");
  closeLightSetupWindow("app cleanup");
  closeDmxDashboardWindow("app cleanup");
  Promise.allSettled([
    audioManager.stop(),
    processManager ? processManager.stopSystem({ force: true }) : Promise.resolve(),
  ]).finally(() => {
    closeManagedWindows("app exit");
    cleanupComplete = true;
    app.exit(0);
  });
}

function broadcastDmxSnapshot() {
  validateManagedWindows();
  if (!dmxDashboardWindow || dmxDashboardWindow.isDestroyed()) return;
  dmxDashboardWindow.webContents.send("desktop:dmx:snapshot", dmxDashboardState.snapshot());
}

function startDmxBridgePolling() {
  if (dmxBridgePollTimer) return;
  dmxBridgePollTimer = setInterval(() => {
    pollDmxBridgeState().catch(() => {});
  }, 200);
  pollDmxBridgeState().catch(() => {});
}

function stopDmxBridgePolling() {
  if (!dmxBridgePollTimer) return;
  clearInterval(dmxBridgePollTimer);
  dmxBridgePollTimer = null;
  dmxBridgePollInFlight = false;
}

async function pollDmxBridgeState() {
  if (dmxBridgePollInFlight || !dmxDashboardState) return;
  dmxBridgePollInFlight = true;
  try {
    const payload = await getJson("http://127.0.0.1:8791/dmx-state", 650);
    dmxDashboardState.applyExternalSnapshot(payload, "qlc_bridge_live");
    broadcastDmxSnapshot();
  } catch (error) {
    dmxDashboardState.setBridgeStatus(`not connected: ${error.message}`);
    broadcastDmxSnapshot();
  } finally {
    dmxBridgePollInFlight = false;
  }
}

function getJson(url, timeoutMs = 800) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

function postJson(url, payload, timeoutMs = 800) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          try {
            resolve(responseBody ? JSON.parse(responseBody) : {});
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function loadSelectedLightSetupIntoOutput({ pushToRunningBridge = true } = {}) {
  if (!lightSetupManager || !dmxDashboardState) return null;
  const loaded = lightSetupManager.loadCurrentFixtureMap();
  let fixtureMap = loaded.fixtureMap;
  let source = loaded.source;
  if (fixtureMap) {
    dmxDashboardState.setFixtureMap(fixtureMap, source);
  } else {
    fixtureMap = Array.isArray(dmxDashboardState.fixtureMap) ? dmxDashboardState.fixtureMap : null;
    source = "built-in six-light test preset";
    if (processManager) {
      processManager.addLog("light-setup", "Using built-in fallback preset because no valid saved setup is selected");
    }
  }

  if (fixtureMap) {
    writeCurrentQlcFixtureMap(fixtureMap);
    processManager.setQlcFixtureMapPath(DEFAULT_QLC_FIXTURE_MAP_PATH);
    if (processManager) {
      processManager.addLog("qlcBridge", `Prepared diagnostic fixture map ${DEFAULT_QLC_FIXTURE_MAP_PATH} from ${source}`);
    }
    if (pushToRunningBridge) {
      void pushFixtureMapToQlcBridge(fixtureMap);
    }
  }
  return loaded;
}

function writeCurrentQlcFixtureMap(fixtureMap) {
  fs.mkdirSync(path.dirname(currentQlcFixtureMapPath), { recursive: true });
  fs.writeFileSync(currentQlcFixtureMapPath, `${JSON.stringify(fixtureMap, null, 2)}\n`);
}

function pushFixtureMapToQlcBridge(fixtureMap) {
  return postJson("http://127.0.0.1:8791/fixture-map", { fixtures: fixtureMap }, 800)
    .then(() => {
      if (processManager) processManager.addLog("qlcBridge", "Selected fixture map pushed to running QLC bridge");
      return true;
    })
    .catch((error) => {
      if (processManager) processManager.addLog("qlcBridge", `QLC bridge fixture-map push skipped: ${error.message}`);
      return false;
    });
}

function shouldLoadSetupBeforeStart() {
  if (!processManager) return false;
  const status = processManager.getSystemStatus();
  const webHealthy = status.services?.webFrontend?.healthy === true;
  const liveAudioHealthy = status.services?.liveAudio?.healthy === true;
  if (status.syncInProgress || status.startInProgress || status.stopInProgress) return false;
  if (status.systemState === "starting" || status.systemState === "stopping") return false;
  if (webHealthy && liveAudioHealthy) return false;
  return true;
}
