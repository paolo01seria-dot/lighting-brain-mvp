"use strict";

const api = window.lightingBrainDesktop;
let uiBusy = false;
let lastStatus = null;
let removeSyncListener = null;

const elements = {
  startSystem: document.querySelector("#startSystem"),
  startQlcBridge: document.querySelector("#startQlcBridge"),
  stopSystem: document.querySelector("#stopSystem"),
  openDashboard: document.querySelector("#openDashboard"),
  openLightSetup: document.querySelector("#openLightSetup"),
  openDmxDashboard: document.querySelector("#openDmxDashboard"),
  toggleAudioSetup: document.querySelector("#toggleAudioSetup"),
  audioSetupPanel: document.querySelector("#audioSetupPanel"),
  openAudioMidiSetup: document.querySelector("#openAudioMidiSetup"),
  refreshLegacyAudio: document.querySelector("#refreshLegacyAudio"),
  forceEnableLegacyAudio: document.querySelector("#forceEnableLegacyAudio"),
  restorePreviousOutput: document.querySelector("#restorePreviousOutput"),
  legacyAudioStatus: document.querySelector("#legacyAudioStatus"),
  legacyAudioInstructions: document.querySelector("#legacyAudioInstructions"),
  cleanStale: document.querySelector("#cleanStale"),
  openExternal: document.querySelector("#openExternal"),
  forceCleanup: document.querySelector("#forceCleanup"),
  serviceList: document.querySelector("#serviceList"),
  audioSources: document.querySelector("#audioSources"),
  logs: document.querySelector("#logs"),
  dashboardUrl: document.querySelector("#dashboardUrl"),
  systemNotice: document.querySelector("#systemNotice"),
};

elements.toggleAudioSetup.addEventListener("click", () => {
  const shouldShow = elements.audioSetupPanel.hidden;
  elements.audioSetupPanel.hidden = !shouldShow;
});

elements.openAudioMidiSetup.addEventListener("click", async () => {
  try {
    await api.legacyAudio.openAudioMidiSetup();
    await refresh();
  } catch (error) {
    appendLocalLog(`audio midi setup error: ${error.message}`);
  }
});

elements.refreshLegacyAudio.addEventListener("click", async () => {
  setBusy(true);
  try {
    await api.legacyAudio.refreshStatus();
    await refresh();
  } catch (error) {
    appendLocalLog(`refresh legacy audio error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.forceEnableLegacyAudio.addEventListener("click", async () => {
  setBusy(true);
  try {
    await api.legacyAudio.forceEnable();
    await refresh();
  } catch (error) {
    appendLocalLog(`force enable legacy audio error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.restorePreviousOutput.addEventListener("click", async () => {
  setBusy(true);
  try {
    await api.legacyAudio.restorePreviousOutput();
    await refresh();
  } catch (error) {
    appendLocalLog(`restore previous output error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.startSystem.addEventListener("click", async () => {
  const requiredHealthy = lastStatus?.services?.webFrontend?.healthy === true
    && lastStatus?.services?.liveAudio?.healthy === true;
  if (uiBusy || lastStatus?.syncInProgress || lastStatus?.systemState === "starting" || lastStatus?.systemState === "stopping" || requiredHealthy) {
    appendLocalLog(
      lastStatus?.syncInProgress
        ? "Start ignored: refreshing app state after second launch..."
        : requiredHealthy
          ? "Start ignored: system already running."
        : "Start ignored: system transition already in progress.",
    );
    return;
  }
  setBusy(true);
  try {
    await api.system.startSystem();
    await refresh();
  } catch (error) {
    appendLocalLog(`launcher error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.startQlcBridge.addEventListener("click", async () => {
  const qlcBridge = lastStatus?.services?.qlcBridge;
  const qlcBridgeRunning = qlcBridge?.healthy === true;
  const qlcBridgeStarting = qlcBridge?.state === "starting" || lastStatus?.qlcBridgeStartInProgress === true;
  if (uiBusy || lastStatus?.syncInProgress || lastStatus?.systemState === "stopping" || qlcBridgeStarting || qlcBridgeRunning) {
    appendLocalLog(
      qlcBridgeRunning
        ? "Start QLC Bridge ignored: bridge already running."
        : "Start QLC Bridge ignored: transition already in progress.",
    );
    return;
  }
  setBusy(true);
  try {
    await api.system.startQlcBridge();
    await refresh();
  } catch (error) {
    appendLocalLog(`start qlc bridge error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.stopSystem.addEventListener("click", async () => {
  setBusy(true);
  try {
    await api.system.stopSystem();
    await refresh();
  } catch (error) {
    appendLocalLog(`launcher error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.openDashboard.addEventListener("click", async () => {
  try {
    await api.system.openDashboard();
  } catch (error) {
    appendLocalLog(`open dashboard error: ${error.message}`);
  }
});

elements.openLightSetup.addEventListener("click", async () => {
  try {
    await api.system.openLightSetup();
  } catch (error) {
    appendLocalLog(`open light setup error: ${error.message}`);
  }
});

elements.openDmxDashboard.addEventListener("click", async () => {
  try {
    await api.system.openDmxDashboard();
  } catch (error) {
    appendLocalLog(`open dmx dashboard error: ${error.message}`);
  }
});

elements.cleanStale.addEventListener("click", async () => {
  setBusy(true);
  try {
    const result = await api.system.cleanStaleProjectServices();
    appendLocalLog(`clean stale result: ${JSON.stringify(result.results)}`);
    await refresh();
  } catch (error) {
    appendLocalLog(`clean stale error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.openExternal.addEventListener("click", async () => {
  try {
    await api.system.openDashboardExternal();
  } catch (error) {
    appendLocalLog(`open external browser error: ${error.message}`);
  }
});

elements.forceCleanup.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Debug / emergency only: this will inspect real listener processes on Lighting Brain ports and stop them. Continue?",
  );
  if (!confirmed) return;
  setBusy(true);
  try {
    const result = await api.system.forceCleanupPorts();
    appendLocalLog(`force cleanup complete: ${JSON.stringify(result.results)}`);
    await refresh();
  } catch (error) {
    appendLocalLog(`force cleanup error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

async function refresh() {
  const [status, logs, audioSources, legacyAudioStatus] = await Promise.all([
    api.system.getSystemStatus(),
    api.system.getLogs(),
    api.audio.listSources(),
    api.legacyAudio.getStatus(),
  ]);
  lastStatus = status;
  elements.dashboardUrl.textContent = status.dashboardUrl;
  renderServices(status.services);
  renderAudioSources(audioSources);
  renderLegacyAudioStatus(legacyAudioStatus);
  renderLogs(logs);
  renderSystemNotice(status);
  syncActionState();
}

function renderServices(services) {
  elements.serviceList.replaceChildren(
    ...Object.values(services).map((service) => {
      const row = document.createElement("article");
      row.className = `service service-${service.state}`;
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(service.label)}</strong>
          <small>${escapeHtml(service.url || "")}</small>
          <small>ownership: ${escapeHtml(service.ownership || "-")}${service.pid ? ` · pid: ${escapeHtml(service.pid)}` : ""}</small>
          ${service.port ? `<small>port: ${escapeHtml(service.port)}</small>` : ""}
          ${service.healthy === false ? `<small class="warning">health: not confirmed</small>` : ""}
          ${service.note ? `<small>${escapeHtml(service.note)}</small>` : ""}
          ${(service.statusDetails || []).map((detail) => `<small>${escapeHtml(detail)}</small>`).join("")}
          ${service.error ? `<small class="error">${escapeHtml(service.error)}</small>` : ""}
        </div>
        <span>${escapeHtml(service.state)}</span>
      `;
      return row;
    }),
  );
}

function renderAudioSources(sources) {
  elements.audioSources.replaceChildren(
    ...sources.map((source) => {
      const row = document.createElement("article");
      row.className = `service service-${source.status.state}`;
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(source.label)}</strong>
          <small>${escapeHtml(source.sourceType)}</small>
          ${source.status.warning ? `<small>${escapeHtml(source.status.warning)}</small>` : ""}
        </div>
        <span>${escapeHtml(source.status.state)}</span>
      `;
      return row;
    }),
  );
}

function renderLegacyAudioStatus(status) {
  const rows = [
    ["Route state", status.routeState],
    ["SwitchAudioSource", status.switchAudioSourceInstalled ? "installed" : "missing"],
    ["Current macOS output", status.currentOutput || "-"],
    ["BlackHole detected", status.blackHoleDetected ? "yes" : "no"],
    ["Supported Multi-Output detected", status.multiOutputDetected || status.dmxMultiOutputDetected ? "yes" : "no"],
    ["Selected Multi-Output", status.selectedMultiOutputDeviceName || "-"],
    ["Electron changed output", status.changedByElectron ? "yes" : "no"],
    ["Saved previous output", status.previousOutput || "-"],
    ["Supported names", status.supportedMultiOutputNames?.join(", ") || "-"],
    ["Available outputs", status.availableOutputs?.join(", ") || "-"],
    ["Available inputs", status.availableInputs?.join(", ") || "-"],
    ["Future path", status.futureModeLabel || "-"],
    ["Mic notice", status.microphoneNotice || "-"],
  ];

  elements.legacyAudioStatus.replaceChildren(
    ...rows.map(([label, value]) => {
      const row = document.createElement("article");
      row.className = "audio-status-row";
      row.innerHTML = `
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      `;
      return row;
    }),
  );

  elements.legacyAudioInstructions.replaceChildren(
    ...(status.instructions?.length
      ? status.instructions.map((instruction) => {
          const row = document.createElement("p");
          row.textContent = instruction;
          return row;
        })
      : [Object.assign(document.createElement("p"), { textContent: "Setup complete. Routing will be managed automatically during Start/Stop." })]),
  );
}

function renderLogs(logs) {
  elements.logs.textContent = logs
    .map((entry) => `[${entry.time}] ${entry.serviceId}: ${entry.message}`)
    .join("\n");
  elements.logs.scrollTop = elements.logs.scrollHeight;
}

function appendLocalLog(message) {
  const line = `[${new Date().toISOString()}] renderer: ${message}`;
  elements.logs.textContent = `${elements.logs.textContent}\n${line}`.trim();
}

function setBusy(isBusy) {
  uiBusy = isBusy;
  syncActionState();
}

function syncActionState() {
  const systemState = lastStatus?.systemState || "stopped";
  const webHealthy = lastStatus?.services?.webFrontend?.healthy === true;
  const liveAudioHealthy = lastStatus?.services?.liveAudio?.healthy === true;
  const requiredHealthy = webHealthy && liveAudioHealthy;
  const syncInProgress = lastStatus?.syncInProgress === true || systemState === "syncing";
  const transitionInProgress = systemState === "starting" || systemState === "stopping";
  const startBlocked = uiBusy || syncInProgress || transitionInProgress || requiredHealthy;
  const qlcBridge = lastStatus?.services?.qlcBridge;
  const qlcBridgeRunning = qlcBridge?.healthy === true;
  const qlcBridgeStarting = qlcBridge?.state === "starting" || lastStatus?.qlcBridgeStartInProgress === true;

  elements.startSystem.disabled = startBlocked;
  elements.startQlcBridge.disabled = uiBusy || syncInProgress || systemState === "stopping" || qlcBridgeStarting || qlcBridgeRunning;
  elements.startQlcBridge.textContent = qlcBridgeRunning
    ? "QLC Bridge running"
    : qlcBridgeStarting
      ? "Starting QLC Bridge..."
      : "Start QLC Bridge";
  elements.stopSystem.disabled = uiBusy || syncInProgress;
  elements.toggleAudioSetup.disabled = uiBusy;
  elements.openAudioMidiSetup.disabled = uiBusy;
  elements.refreshLegacyAudio.disabled = uiBusy;
  elements.forceEnableLegacyAudio.disabled = uiBusy;
  elements.restorePreviousOutput.disabled = uiBusy;
  elements.cleanStale.disabled = uiBusy;
  elements.openLightSetup.disabled = uiBusy || syncInProgress || !webHealthy;
  elements.openDashboard.disabled = uiBusy || syncInProgress || !webHealthy;
  elements.openExternal.disabled = uiBusy;
  elements.forceCleanup.disabled = uiBusy;
}

function renderSystemNotice(status) {
  const message = status?.syncInProgress
    ? (status.syncMessage || "Refreshing app state after second launch...")
    : "";
  elements.systemNotice.hidden = !message;
  elements.systemNotice.textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

removeSyncListener = api.system.onSyncState((status) => {
  lastStatus = status;
  renderServices(status.services);
  renderSystemNotice(status);
  syncActionState();
});

refresh();
setInterval(refresh, 1500);
