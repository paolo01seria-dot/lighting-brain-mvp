"use strict";

const api = window.lightingBrainDesktop;

const elements = {
  startSystem: document.querySelector("#startSystem"),
  stopSystem: document.querySelector("#stopSystem"),
  openDashboard: document.querySelector("#openDashboard"),
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

async function refresh() {
  const [status, logs, audioSources, legacyAudioStatus] = await Promise.all([
    api.system.getSystemStatus(),
    api.system.getLogs(),
    api.audio.listSources(),
    api.legacyAudio.getStatus(),
  ]);
  elements.dashboardUrl.textContent = status.dashboardUrl;
  renderServices(status.services);
  renderAudioSources(audioSources);
  renderLegacyAudioStatus(legacyAudioStatus);
  renderLogs(logs);
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
    ["DMX Multi-Output detected", status.dmxMultiOutputDetected ? "yes" : "no"],
    ["Electron changed output", status.changedByElectron ? "yes" : "no"],
    ["Saved previous output", status.previousOutput || "-"],
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
  elements.startSystem.disabled = isBusy;
  elements.stopSystem.disabled = isBusy;
  elements.toggleAudioSetup.disabled = isBusy;
  elements.openAudioMidiSetup.disabled = isBusy;
  elements.refreshLegacyAudio.disabled = isBusy;
  elements.forceEnableLegacyAudio.disabled = isBusy;
  elements.restorePreviousOutput.disabled = isBusy;
  elements.cleanStale.disabled = isBusy;
  elements.openDashboard.disabled = isBusy;
  elements.openExternal.disabled = isBusy;
  elements.forceCleanup.disabled = isBusy;
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

refresh();
setInterval(refresh, 1500);
