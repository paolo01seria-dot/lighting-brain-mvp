"use strict";

const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { AudioCaptureManager } = require("./audio/AudioCaptureManager");
const { MockAudioCaptureDriver } = require("./audio/drivers/MockAudioCaptureDriver");
const { BlackHoleLegacyDriver } = require("./audio/drivers/BlackHoleLegacyDriver");
const { MacCoreAudioTapDriver } = require("./audio/drivers/MacCoreAudioTapDriver");
const { WindowsWasapiLoopbackDriver } = require("./audio/drivers/WindowsWasapiLoopbackDriver");
const { MicrophoneFallbackDriver } = require("./audio/drivers/MicrophoneFallbackDriver");
const { AUDIO_SOURCE_TYPES } = require("./audio/sourceTypes");

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
  const window = new BrowserWindow({
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

  const desktopUrl = process.env.LIGHTING_BRAIN_DESKTOP_URL;
  if (desktopUrl) {
    window.loadURL(desktopUrl);
  } else {
    window.loadFile(path.join(__dirname, "../../web/index.html"));
  }
}

function registerIpc() {
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
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  audioManager.stop().catch(() => {});
  if (process.platform !== "darwin") {
    app.quit();
  }
});
