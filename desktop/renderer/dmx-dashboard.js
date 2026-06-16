"use strict";

const api = window.lightingBrainDesktop;
let snapshot = null;
let filter = "mapped";
let manualArmed = false;

const elements = {
  channelFilter: document.querySelector("#channelFilter"),
  refreshDmx: document.querySelector("#refreshDmx"),
  driverStatus: document.querySelector("#driverStatus"),
  fixtureMapSource: document.querySelector("#fixtureMapSource"),
  qlcBridgeStatus: document.querySelector("#qlcBridgeStatus"),
  manualStatus: document.querySelector("#manualStatus"),
  armManual: document.querySelector("#armManual"),
  blackoutDmx: document.querySelector("#blackoutDmx"),
  channelCount: document.querySelector("#channelCount"),
  channelGrid: document.querySelector("#channelGrid"),
  diagnostics: document.querySelector("#diagnostics"),
  eventLog: document.querySelector("#eventLog"),
};

elements.channelFilter.addEventListener("change", () => {
  filter = elements.channelFilter.value;
  render();
});

elements.refreshDmx.addEventListener("click", refresh);

elements.armManual.addEventListener("click", async () => {
  const nextArmed = !manualArmed;
  snapshot = await api.dmx.setManualArmed(nextArmed);
  render();
});

elements.blackoutDmx.addEventListener("click", async () => {
  if (!manualArmed) {
    appendEventNotice("Blackout ignored: arm Manual DMX Test first.");
    return;
  }
  const result = await api.dmx.blackout();
  snapshot = result.snapshot;
  render();
});

api.dmx.onSnapshot((nextSnapshot) => {
  snapshot = nextSnapshot;
  render();
});

refresh();

async function refresh() {
  snapshot = await api.dmx.getSnapshot();
  render();
}

function render() {
  if (!snapshot) return;
  manualArmed = Boolean(snapshot.manualArmed);
  elements.driverStatus.textContent = `${snapshot.driver} (${snapshot.outputMode}) - ${snapshot.driverStatus}`;
  elements.fixtureMapSource.textContent = snapshot.fixtureMapSource;
  elements.qlcBridgeStatus.textContent = snapshot.qlcBridgeStatus;
  elements.manualStatus.textContent = manualArmed ? "armed" : "disarmed";
  elements.armManual.textContent = manualArmed ? "Disarm Manual DMX Test" : "Arm Manual DMX Test";
  elements.blackoutDmx.disabled = !manualArmed;

  const channels = visibleChannels(snapshot.channels);
  elements.channelCount.textContent = `${channels.length} channels`;
  elements.channelGrid.replaceChildren(...channels.map(renderChannel));
  renderDiagnostics(snapshot.diagnostics);
  renderEvents(snapshot.events);
}

function visibleChannels(channels) {
  if (filter === "all") return channels;
  if (filter === "changed") return channels.filter((channel) => channel.recentlyChanged || channel.value !== 0);
  return channels.filter((channel) => channel.mapped);
}

function renderChannel(channel) {
  const tile = document.createElement("article");
  tile.className = `channel-tile${channel.mapped ? " is-mapped" : ""}${channel.recentlyChanged ? " is-changed" : ""}`;
  const fixture = channel.fixtureLabel || "unmapped";
  const role = channel.role || "-";
  tile.innerHTML = `
    <header>
      <strong>CH${String(channel.channel).padStart(3, "0")}</strong>
      <span>${escapeHtml(role)}</span>
    </header>
    <input
      type="range"
      min="0"
      max="255"
      value="${channel.value}"
      ${manualArmed && channel.controllable !== false ? "" : "disabled"}
      aria-label="DMX channel ${channel.channel}"
    >
    <div class="channel-value">${channel.value}</div>
    <small>${escapeHtml(fixture)}</small>
    <small>${escapeHtml(channel.label || "")}</small>
  `;
  const input = tile.querySelector("input");
  input.addEventListener("input", async () => {
    const result = await api.dmx.setChannel(channel.channel, input.value);
    snapshot = result.snapshot || await api.dmx.getSnapshot();
    render();
  });
  return tile;
}

function renderDiagnostics(diagnostics) {
  const items = [
    ["Mapped channels", diagnostics.mappedChannels?.length || 0],
    ["Unused/unknown channels", diagnostics.unusedChannels?.join(", ") || "-"],
    ["Out of range", diagnostics.outOfRange?.length ? JSON.stringify(diagnostics.outOfRange) : "none"],
    ["Overlaps", diagnostics.overlaps?.length ? JSON.stringify(diagnostics.overlaps) : "none"],
  ];
  elements.diagnostics.replaceChildren(...items.map(([label, value]) => {
    const row = document.createElement("article");
    row.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span>`;
    return row;
  }));
}

function renderEvents(events) {
  const recent = [...events].reverse();
  elements.eventLog.replaceChildren(...recent.map((event) => {
    const row = document.createElement("article");
    const changes = event.changedChannels?.length
      ? event.changedChannels.map((change) => `CH${String(change.channel).padStart(3, "0")}=${change.new}`).join(" ")
      : "no changes";
    row.innerHTML = `
      <strong>${escapeHtml(event.source)}</strong>
      <small>${escapeHtml(event.timestamp)} · ${event.emitted ? "sent/mirrored" : "mirrored only"}</small>
      <span>${escapeHtml(changes)}</span>
    `;
    return row;
  }));
}

function appendEventNotice(message) {
  const row = document.createElement("article");
  row.innerHTML = `<strong>dashboard</strong><span>${escapeHtml(message)}</span>`;
  elements.eventLog.prepend(row);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
