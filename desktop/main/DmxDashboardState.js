"use strict";

const DMX_UNIVERSE_SIZE = 512;

const SIX_LIGHT_TEST_PRESET = [
  { id: "fixture_001", label: "RGB 3CH addr 001", address: 1, channels: 3, rgb: { r: 1, g: 2, b: 3 } },
  { id: "fixture_009", label: "RGB 3CH addr 009", address: 9, channels: 3, rgb: { r: 1, g: 2, b: 3 } },
  { id: "fixture_017", label: "RGB 6CH addr 017", address: 17, channels: 6, dimmer: 1, rgb: { r: 2, g: 3, b: 4 }, strobe: 5, mode: 6 },
  { id: "fixture_025", label: "RGB 6CH addr 025", address: 25, channels: 6, dimmer: 1, rgb: { r: 2, g: 3, b: 4 }, strobe: 5, mode: 6 },
  { id: "fixture_034", label: "RGB 6CH addr 034", address: 34, channels: 6, dimmer: 1, rgb: { r: 2, g: 3, b: 4 }, strobe: 5, mode: 6 },
  {
    id: "fixture_041",
    label: "Dual RGBW 12CH addr 041",
    address: 41,
    channels: 12,
    dimmer: 1,
    rgb: { r: 2, g: 3, b: 4 },
    white: 5,
    rgb2: { r: 6, g: 7, b: 8 },
    white2: 9,
    strobe: 10,
    mode: 11,
    speed: 12,
  },
];

class DmxDashboardState {
  constructor({ logger = null, fixtureMap = SIX_LIGHT_TEST_PRESET } = {}) {
    this.logger = logger;
    this.fixtureMap = cloneFixtureMap(fixtureMap);
    this.channels = new Array(DMX_UNIVERSE_SIZE).fill(0);
    this.events = [];
    this.manualArmed = false;
    this.outputMode = "mock";
    this.driver = "ElectronMockDmxDriver";
    this.driverStatus = "mock-only; no hardware access";
    this.fixtureMapSource = "six_light_test_preset_until_setup_light_config_is_loaded";
    this.qlcBridgeStatus = "not connected";
    this.lastChangedAt = new Map();
  }

  setFixtureMap(fixtureMap, source = "selected light setup") {
    if (!Array.isArray(fixtureMap) || fixtureMap.length === 0) {
      this.log("Ignored empty fixture map update");
      return this.snapshot();
    }
    this.fixtureMap = cloneFixtureMap(fixtureMap);
    this.fixtureMapSource = source;
    this.blackout({ source: "fixture_setup_changed_blackout", emitted: true });
    this.log(`Fixture map loaded: ${source}`);
    return this.snapshot();
  }

  setManualArmed(armed) {
    this.manualArmed = Boolean(armed);
    this.log(`Manual DMX Test ${this.manualArmed ? "armed" : "disarmed"}`);
    return this.snapshot();
  }

  manualSetChannel(channel, value) {
    if (!this.manualArmed) {
      this.log("Manual DMX fader ignored: test mode is not armed");
      return { ok: false, reason: "manual_test_not_armed", snapshot: this.snapshot() };
    }
    const changes = this.setChannel(channel, value, { source: "manual_dmx_dashboard", emitted: true });
    return { ok: true, changes, snapshot: this.snapshot() };
  }

  applyQlcWebCommand({ path = "", payload = {} } = {}) {
    this.outputMode = "desktop_direct";
    this.driver = "ElectronDmxDashboardMirror";
    this.driverStatus = "direct IPC mirror from Electron web dashboard; no QLC bridge required";
    this.qlcBridgeStatus = "not required for desktop direct mirror";
    if (path === "/blackout") {
      return this.blackout({ source: "desktop_direct_blackout", emitted: false });
    }
    if (path === "/channel") {
      const changes = this.setChannel(payload.address, payload.value, { source: "desktop_direct_channel", emitted: false });
      return { ok: true, changes, snapshot: this.snapshot() };
    }
    if (path === "/scene") {
      const changes = this.applyScenePayload(payload, { source: "desktop_direct_scene", emitted: false });
      return { ok: true, changes, snapshot: this.snapshot() };
    }
    if (path === "/fixture-map") {
      if (Array.isArray(payload.fixtures) && payload.fixtures.length) {
        return { ok: true, snapshot: this.setFixtureMap(payload.fixtures, "webapp setup light fixture map") };
      }
      return { ok: false, error: "fixture-map payload has no fixtures", snapshot: this.snapshot() };
    }
    const rgbMatch = path.match(/^\/fixture\/([^/]+)\/rgb$/u);
    if (rgbMatch) {
      const changes = this.setFixtureRgb(rgbMatch[1], payload, { source: `desktop_direct_fixture_rgb:${rgbMatch[1]}`, emitted: false });
      return { ok: true, changes, snapshot: this.snapshot() };
    }
    const rawMatch = path.match(/^\/fixture\/([^/]+)\/raw$/u);
    if (rawMatch) {
      const changes = this.setFixtureRaw(rawMatch[1], payload.values || payload.raw || [], {
        source: `desktop_direct_fixture_raw:${rawMatch[1]}`,
        emitted: false,
      });
      return { ok: true, changes, snapshot: this.snapshot() };
    }
    return { ok: false, error: `unsupported mirror path: ${path}`, snapshot: this.snapshot() };
  }

  applyScenePayload(payload, { source = "desktop_direct_scene", emitted = false } = {}) {
    const fixtures = payload?.fixtures || payload || {};
    const mapping = {};
    for (const [fixtureId, command] of Object.entries(fixtures)) {
      Object.assign(mapping, this.mappingForFixtureCommand(fixtureId, command));
    }
    return this.setChannels(mapping, { source, emitted });
  }

  setFixtureRgb(fixtureId, command, { source = "desktop_direct_fixture_rgb", emitted = false } = {}) {
    return this.setChannels(this.mappingForFixtureRgb(fixtureId, command), { source, emitted });
  }

  setFixtureRaw(fixtureId, values, { source = "desktop_direct_fixture_raw", emitted = false } = {}) {
    const fixture = this.fixtureById(fixtureId);
    if (!fixture) {
      this.log(`Ignored DMX raw for unknown fixture ${fixtureId}`);
      return [];
    }
    const mapping = {};
    values.slice(0, Number(fixture.channels)).forEach((value, index) => {
      mapping[absoluteChannel(fixture, index + 1)] = value;
    });
    return this.setChannels(mapping, { source, emitted });
  }

  mappingForFixtureCommand(fixtureId, command = {}) {
    if (command.raw || command.values) {
      const fixture = this.fixtureById(fixtureId);
      if (!fixture) return {};
      const mapping = {};
      (command.raw || command.values).slice(0, Number(fixture.channels)).forEach((value, index) => {
        mapping[absoluteChannel(fixture, index + 1)] = value;
      });
      return mapping;
    }
    return this.mappingForFixtureRgb(fixtureId, command);
  }

  mappingForFixtureRgb(fixtureId, command = {}) {
    const fixture = this.fixtureById(fixtureId);
    if (!fixture) {
      this.log(`Ignored DMX rgb for unknown fixture ${fixtureId}`);
      return {};
    }
    const intensity = clamp01(command.intensity ?? 1);
    const red = clampDmx(normalizeColorValue(command.r ?? 0) * intensity);
    const green = clampDmx(normalizeColorValue(command.g ?? 0) * intensity);
    const blue = clampDmx(normalizeColorValue(command.b ?? 0) * intensity);
    const mapping = {};
    setRgbMapping(mapping, fixture, fixture.rgb, { r: red, g: green, b: blue });
    setRgbMapping(mapping, fixture, fixture.rgb2, { r: red, g: green, b: blue });
    if (fixture.dimmer !== undefined && fixture.dimmer !== null) {
      mapping[absoluteChannel(fixture, fixture.dimmer)] = clampDmx(255 * intensity);
    }
    for (const key of ["white", "white2", "strobe", "mode", "speed"]) {
      if (fixture[key] !== undefined && fixture[key] !== null) {
        mapping[absoluteChannel(fixture, fixture[key])] = 0;
      }
    }
    return mapping;
  }

  fixtureById(fixtureId) {
    return this.fixtureMap.find((fixture) => fixture.id === fixtureId);
  }

  blackout({ source = "manual_dmx_dashboard_blackout", emitted = true } = {}) {
    const mapping = {};
    for (const channel of this.controllableChannels()) {
      mapping[channel] = 0;
    }
    const changes = this.setChannels(mapping, { source, emitted });
    return { ok: true, changes, snapshot: this.snapshot() };
  }

  setChannel(channel, value, { source = "dmx_dashboard", emitted = true } = {}) {
    return this.setChannels({ [channel]: value }, { source, emitted });
  }

  setChannels(mapping, { source = "dmx_dashboard", emitted = true } = {}) {
    const changes = [];
    for (const [rawChannel, rawValue] of Object.entries(mapping)) {
      const channel = Number(rawChannel);
      if (!Number.isInteger(channel) || channel < 1 || channel > DMX_UNIVERSE_SIZE) {
        throw new Error(`DMX channel out of range: ${rawChannel}`);
      }
      const value = clampDmx(rawValue);
      const index = channel - 1;
      const old = this.channels[index];
      if (old === value) continue;
      this.channels[index] = value;
      this.lastChangedAt.set(channel, Date.now());
      changes.push({ channel, old, new: value });
    }
    this.recordEvent({ source, emitted, changes });
    return changes;
  }

  applyExternalSnapshot(snapshot, source = "external_dmx_snapshot") {
    const channels = normalizeSnapshotChannels(snapshot?.channels);
    if (!channels.length) {
      this.setBridgeStatus("connected, no channels reported");
      return this.snapshot();
    }
    const mapping = {};
    for (const channel of channels) {
      mapping[channel.channel] = channel.value;
    }
    this.outputMode = snapshot.outputMode || "qlc_bridge";
    this.driver = snapshot.driver || "QLCWebBridge";
    this.driverStatus = snapshot.driverStatus || "mirroring live QLC bridge state";
    this.qlcBridgeStatus = snapshot.qlcBridgeStatus || "connected";
    if (snapshot.fixtureMapSource) {
      this.fixtureMapSource = snapshot.fixtureMapSource;
    }
    const changes = this.applyChannelsSilently(mapping);
    if (changes.length > 0) {
      this.recordEvent({ source, emitted: true, changes });
    }
    return this.snapshot();
  }

  applyChannelsSilently(mapping) {
    const changes = [];
    for (const [rawChannel, rawValue] of Object.entries(mapping)) {
      const channel = Number(rawChannel);
      if (!Number.isInteger(channel) || channel < 1 || channel > DMX_UNIVERSE_SIZE) continue;
      const value = clampDmx(rawValue);
      const index = channel - 1;
      const old = this.channels[index];
      if (old === value) continue;
      this.channels[index] = value;
      this.lastChangedAt.set(channel, Date.now());
      changes.push({ channel, old, new: value });
    }
    return changes;
  }

  setBridgeStatus(status) {
    this.qlcBridgeStatus = status;
  }

  snapshot() {
    const labels = buildChannelLabels(this.fixtureMap);
    const diagnostics = buildDiagnostics(this.fixtureMap, labels);
    const now = Date.now();
    return {
      universe: 0,
      size: DMX_UNIVERSE_SIZE,
      outputMode: this.outputMode,
      driver: this.driver,
      driverStatus: this.driverStatus,
      fixtureMapSource: this.fixtureMapSource,
      manualArmed: this.manualArmed,
      channels: this.channels.map((value, index) => ({
        channel: index + 1,
        value,
        mapped: Boolean(labels[index + 1]),
        recentlyChanged: now - (this.lastChangedAt.get(index + 1) || 0) < 1200,
        ...(labels[index + 1] || {}),
      })),
      diagnostics,
      events: this.events.slice(-50),
      qlcBridgeStatus: this.qlcBridgeStatus,
    };
  }

  controllableChannels() {
    return Object.keys(buildChannelLabels(this.fixtureMap)).map(Number);
  }

  recordEvent({ source, emitted, changes }) {
    this.events.push({
      timestamp: new Date().toISOString(),
      outputMode: this.outputMode,
      driver: this.driver,
      source,
      emitted: Boolean(emitted),
      changedChannels: changes,
    });
    this.events = this.events.slice(-50);
    if (changes.length > 0) {
      this.log(`${source}: ${changes.map((change) => `CH${String(change.channel).padStart(3, "0")}=${change.new}`).join(" ")}`);
    } else {
      this.log(`${source}: no DMX changes`);
    }
  }

  log(message) {
    if (this.logger) this.logger("dmx-dashboard", message);
  }
}

function clampDmx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(255, Math.round(number)));
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function normalizeColorValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number >= 0 && number <= 1 ? number * 255 : number;
}

function setRgbMapping(mapping, fixture, rgb, values) {
  if (!rgb) return;
  for (const [key, value] of Object.entries(values)) {
    if (rgb[key] === undefined || rgb[key] === null) continue;
    mapping[absoluteChannel(fixture, rgb[key])] = value;
  }
}

function cloneFixtureMap(fixtureMap) {
  return fixtureMap.map((fixture) => ({
    ...fixture,
    rgb: fixture.rgb ? { ...fixture.rgb } : undefined,
    rgb2: fixture.rgb2 ? { ...fixture.rgb2 } : undefined,
  }));
}

function normalizeSnapshotChannels(channels) {
  if (!channels) return [];
  if (Array.isArray(channels)) {
    return channels
      .map((entry) => ({
        channel: Number(entry.channel),
        value: Number(entry.value),
      }))
      .filter((entry) => Number.isInteger(entry.channel));
  }
  return Object.entries(channels).map(([channel, value]) => ({
    channel: Number(channel),
    value: Number(value),
  })).filter((entry) => Number.isInteger(entry.channel));
}

function absoluteChannel(fixture, localChannel) {
  return Number(fixture.address) + Number(localChannel) - 1;
}

function buildChannelLabels(fixtures) {
  const labels = {};
  for (const fixture of fixtures) {
    for (let local = 1; local <= Number(fixture.channels); local += 1) {
      const channel = absoluteChannel(fixture, local);
      labels[channel] = {
        fixtureId: fixture.id,
        fixtureLabel: fixture.label || fixture.id,
        localChannel: local,
        role: "unused",
        label: `${fixture.label || fixture.id} CH${local}`,
        controllable: true,
      };
    }
    setRgbLabels(labels, fixture, fixture.rgb, { r: "R", g: "G", b: "B" });
    setRgbLabels(labels, fixture, fixture.rgb2, { r: "R2", g: "G2", b: "B2" });
    for (const [key, role] of Object.entries({ dimmer: "DIMMER", white: "W1", white2: "W2", strobe: "STROBE", mode: "MODE", speed: "SPEED" })) {
      if (fixture[key] !== undefined && fixture[key] !== null) {
        const channel = absoluteChannel(fixture, fixture[key]);
        labels[channel] = { ...labels[channel], role, label: `${fixture.label || fixture.id} ${role}` };
      }
    }
  }
  return labels;
}

function setRgbLabels(labels, fixture, rgb, names) {
  if (!rgb) return;
  for (const [key, role] of Object.entries(names)) {
    if (rgb[key] === undefined || rgb[key] === null) continue;
    const channel = absoluteChannel(fixture, rgb[key]);
    labels[channel] = { ...labels[channel], role, label: `${fixture.label || fixture.id} ${role}` };
  }
}

function buildDiagnostics(fixtures, labels) {
  const seen = new Map();
  const overlaps = [];
  const outOfRange = [];
  for (const fixture of fixtures) {
    for (let local = 1; local <= Number(fixture.channels); local += 1) {
      const channel = absoluteChannel(fixture, local);
      if (channel < 1 || channel > DMX_UNIVERSE_SIZE) {
        outOfRange.push({ fixtureId: fixture.id, channel });
      }
      if (seen.has(channel)) {
        overlaps.push({ channel, fixtureIds: [seen.get(channel), fixture.id] });
      }
      seen.set(channel, fixture.id);
    }
  }
  return {
    outOfRange,
    overlaps,
    unusedChannels: Object.entries(labels).filter(([, label]) => label.role === "unused").map(([channel]) => Number(channel)).sort((a, b) => a - b),
    mappedChannels: Array.from(seen.keys()).sort((a, b) => a - b),
  };
}

module.exports = {
  DmxDashboardState,
  SIX_LIGHT_TEST_PRESET,
};
