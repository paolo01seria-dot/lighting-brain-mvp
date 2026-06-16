"use strict";

const api = window.lightingBrainDesktop;
let uiBusy = false;
let lastStatus = null;
let lastLightSetupStatus = null;
let selectedSetupPath = null;
let removeSyncListener = null;

const elements = {
  startSystem: document.querySelector("#startSystem"),
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
  refreshSetups: document.querySelector("#refreshSetups"),
  openSetupLight: document.querySelector("#openSetupLight"),
  validateSetup: document.querySelector("#validateSetup"),
  setCurrentSetup: document.querySelector("#setCurrentSetup"),
  currentSetupSummary: document.querySelector("#currentSetupSummary"),
  setupList: document.querySelector("#setupList"),
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
  const includeExternalQlc = window.confirm(
    "Include port 9999 too? Choose OK only if you also want to stop external QLC+ Web Interface.",
  );
  setBusy(true);
  try {
    const result = await api.system.forceCleanupPorts({ includeExternalQlc });
    appendLocalLog(`force cleanup complete: ${JSON.stringify(result.results)}`);
    await refresh();
  } catch (error) {
    appendLocalLog(`force cleanup error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.refreshSetups.addEventListener("click", async () => {
  setBusy(true);
  try {
    lastLightSetupStatus = await api.lightSetup.refresh();
    selectedSetupPath = lastLightSetupStatus.current?.path || selectedSetupPath;
    renderLightSetup(lastLightSetupStatus);
  } catch (error) {
    appendLocalLog(`refresh setups error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

elements.openSetupLight.addEventListener("click", async () => {
  try {
    await api.system.openLightSetup();
    appendLocalLog("Light Setup opened in its dedicated window.");
  } catch (error) {
    appendLocalLog(`open setup light error: ${error.message}`);
  }
});

elements.validateSetup.addEventListener("click", async () => {
  if (!selectedSetupPath) {
    appendLocalLog("validate setup ignored: no saved setup selected");
    return;
  }
  try {
    const result = await api.lightSetup.validate(selectedSetupPath);
    appendLocalLog(`setup validation: ${result.valid ? "valid" : `invalid - ${result.error}`}`);
    await refresh();
  } catch (error) {
    appendLocalLog(`validate setup error: ${error.message}`);
  }
});

elements.setCurrentSetup.addEventListener("click", async () => {
  if (!selectedSetupPath) {
    appendLocalLog("set current setup ignored: no saved setup selected");
    return;
  }
  setBusy(true);
  try {
    const result = await api.lightSetup.setCurrent(selectedSetupPath);
    if (!result.ok) {
      appendLocalLog(`set current setup failed: ${result.error || "unknown error"}`);
    }
    lastLightSetupStatus = result.status || await api.lightSetup.getStatus();
    selectedSetupPath = lastLightSetupStatus.current?.path || selectedSetupPath;
    renderLightSetup(lastLightSetupStatus);
    appendLocalLog(result.ok ? `current setup selected: ${selectedSetupPath}` : "current setup unchanged");
  } catch (error) {
    appendLocalLog(`set current setup error: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

async function refresh() {
  const [status, logs, audioSources, legacyAudioStatus, lightSetupStatus] = await Promise.all([
    api.system.getSystemStatus(),
    api.system.getLogs(),
    api.audio.listSources(),
    api.legacyAudio.getStatus(),
    api.lightSetup.getStatus(),
  ]);
  lastStatus = status;
  lastLightSetupStatus = lightSetupStatus;
  selectedSetupPath = selectedSetupPath || lightSetupStatus.current?.path || null;
  elements.dashboardUrl.textContent = status.dashboardUrl;
  renderServices(status.services);
  renderAudioSources(audioSources);
  renderLegacyAudioStatus(legacyAudioStatus);
  renderLightSetup(lightSetupStatus);
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

function renderLightSetup(status) {
  const current = status.current || {};
  elements.currentSetupSummary.replaceChildren(...[
    ["Current/default setup", current.name || "-"],
    ["Path", current.path || "built-in fallback preset"],
    ["Fixtures", current.fixtureCount ?? 0],
    ["Mapped DMX channels", current.mappedChannelCount ?? 0],
    ["Validity", current.valid ? "valid" : `invalid: ${current.error || "unknown"}`],
    ["Last modified", current.lastModified || "-"],
    ["Setup folder", status.setupDirectory || "-"],
    ["Selection config", status.selectionPath || "-"],
  ].map(([label, value]) => {
    const row = document.createElement("article");
    row.className = "setup-summary-row";
    row.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span>`;
    return row;
  }));

  const setups = status.setups || [];
  if (!setups.length) {
    const empty = document.createElement("p");
    empty.className = "summary";
    empty.textContent = "No saved setup files found yet. Put Setup Light JSON files in the setup folder.";
    elements.setupList.replaceChildren(empty);
    return;
  }
  elements.setupList.replaceChildren(...setups.map((setup) => renderSetupItem(setup, current)));
}

function renderSetupItem(setup, current) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = `setup-item${setup.valid ? "" : " setup-invalid"}${setup.path === current.path ? " setup-current" : ""}${setup.path === selectedSetupPath ? " setup-selected" : ""}`;
  item.innerHTML = `
    <strong>${escapeHtml(setup.name)}</strong>
    <small>${escapeHtml(setup.path || "")}</small>
    <span>${escapeHtml(setup.fixtureCount)} fixtures · ${escapeHtml(setup.mappedChannelCount)} channels · ${setup.valid ? "valid" : `invalid: ${escapeHtml(setup.error || "unknown")}`}</span>
    <small>${escapeHtml(setup.lastModified || "-")}</small>
  `;
  item.addEventListener("click", () => {
    selectedSetupPath = setup.path;
    renderLightSetup(lastLightSetupStatus);
    syncActionState();
  });
  return item;
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

  elements.startSystem.disabled = startBlocked;
  elements.stopSystem.disabled = uiBusy || syncInProgress;
  elements.toggleAudioSetup.disabled = uiBusy;
  elements.openAudioMidiSetup.disabled = uiBusy;
  elements.refreshLegacyAudio.disabled = uiBusy;
  elements.forceEnableLegacyAudio.disabled = uiBusy;
  elements.restorePreviousOutput.disabled = uiBusy;
  elements.cleanStale.disabled = uiBusy;
  elements.refreshSetups.disabled = uiBusy;
  elements.openSetupLight.disabled = uiBusy || syncInProgress || !webHealthy;
  elements.openLightSetup.disabled = uiBusy || syncInProgress || !webHealthy;
  elements.validateSetup.disabled = uiBusy || !selectedSetupPath;
  elements.setCurrentSetup.disabled = uiBusy || !selectedSetupPath;
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
