"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_LIBRARY_DIR = path.join("configs", "light-setups");
const LEGACY_FIXTURE_MAP = path.join("configs", "fixture_map.json");
const SELECTION_FILE = path.join("configs", "light_setup_selection.json");

class LightSetupManager {
  constructor({ projectRoot, logger = null }) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.libraryDir = path.join(projectRoot, DEFAULT_LIBRARY_DIR);
    this.legacyFixtureMapPath = path.join(projectRoot, LEGACY_FIXTURE_MAP);
    this.selectionPath = path.join(projectRoot, SELECTION_FILE);
    this.current = null;
  }

  refresh() {
    fs.mkdirSync(this.libraryDir, { recursive: true });
    const setups = this.listSetups();
    const selectedPath = this.readSelectionPath();
    let current = setups.find((setup) => selectedPath && samePath(setup.path, selectedPath)) || null;
    if (!current) {
      current = setups.find((setup) => setup.valid) || fallbackPresetSummary();
    }
    this.current = current;
    return this.status(setups);
  }

  status(setups = this.listSetups()) {
    const current = this.current || setups.find((setup) => setup.valid) || fallbackPresetSummary();
    return {
      current,
      setups,
      setupDirectory: this.libraryDir,
      selectionPath: this.selectionPath,
    };
  }

  listSetups() {
    const candidates = [];
    for (const filePath of this.setupFileCandidates()) {
      candidates.push(this.summarizeSetup(filePath));
    }
    return candidates.sort((left, right) => {
      if (left.valid !== right.valid) return left.valid ? -1 : 1;
      return String(left.name).localeCompare(String(right.name));
    });
  }

  loadCurrentFixtureMap() {
    const status = this.refresh();
    if (!status.current.valid || !status.current.path) {
      this.log("No valid saved setup selected; using built-in six-light test preset");
      return {
        fixtureMap: null,
        source: "built-in six-light test preset",
        setupStatus: status,
      };
    }
    const payload = JSON.parse(fs.readFileSync(status.current.path, "utf8"));
    const fixtureMap = fixtureMapFromPayload(payload);
    return {
      fixtureMap,
      source: status.current.path,
      setupStatus: status,
    };
  }

  setCurrentSetup(filePath) {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    const summary = this.summarizeSetup(absolutePath);
    if (!summary.valid) {
      return { ok: false, error: summary.error || "Setup is invalid", status: this.refresh() };
    }
    fs.mkdirSync(path.dirname(this.selectionPath), { recursive: true });
    const relativeSetupPath = path.relative(this.projectRoot, absolutePath);
    const selectedSetupPath = relativeSetupPath && !relativeSetupPath.startsWith("..") && !path.isAbsolute(relativeSetupPath)
      ? relativeSetupPath
      : absolutePath;
    fs.writeFileSync(this.selectionPath, `${JSON.stringify({
      selectedSetupPath,
      selectedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    this.current = summary;
    this.log(`Selected light setup: ${absolutePath}`);
    return { ok: true, status: this.refresh() };
  }

  validateSetup(filePath) {
    return this.summarizeSetup(path.resolve(this.projectRoot, filePath));
  }

  setupFileCandidates() {
    const files = [];
    if (fs.existsSync(this.legacyFixtureMapPath)) files.push(this.legacyFixtureMapPath);
    if (fs.existsSync(this.libraryDir)) {
      for (const name of fs.readdirSync(this.libraryDir)) {
        if (name.toLowerCase().endsWith(".json")) {
          files.push(path.join(this.libraryDir, name));
        }
      }
    }
    return Array.from(new Set(files.map((filePath) => path.resolve(filePath))));
  }

  summarizeSetup(filePath) {
    try {
      const stat = fs.statSync(filePath);
      const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const fixtureMap = fixtureMapFromPayload(payload);
      const diagnostics = fixtureMapDiagnostics(fixtureMap);
      const valid = diagnostics.outOfRange.length === 0 && diagnostics.overlaps.length === 0;
      return {
        name: payload.name || payload.title || path.basename(filePath, ".json"),
        path: filePath,
        valid,
        error: valid ? null : "Fixture map has invalid or overlapping channels",
        fixtureCount: fixtureMap.length,
        mappedChannelCount: diagnostics.mappedChannels.length,
        mappedChannels: diagnostics.mappedChannels,
        diagnostics,
        lastModified: stat.mtime.toISOString(),
      };
    } catch (error) {
      return {
        name: path.basename(filePath, ".json"),
        path: filePath,
        valid: false,
        error: error.message,
        fixtureCount: 0,
        mappedChannelCount: 0,
        mappedChannels: [],
        diagnostics: { outOfRange: [], overlaps: [], mappedChannels: [] },
        lastModified: null,
      };
    }
  }

  readSelectionPath() {
    try {
      const payload = JSON.parse(fs.readFileSync(this.selectionPath, "utf8"));
      return payload.selectedSetupPath ? path.resolve(this.projectRoot, payload.selectedSetupPath) : null;
    } catch (_error) {
      return null;
    }
  }

  log(message) {
    if (this.logger) this.logger("light-setup", message);
  }
}

function fixtureMapFromPayload(payload) {
  if (Array.isArray(payload)) return normalizeFixtureMap(payload);
  if (Array.isArray(payload.qlcFixtures) && payload.qlcFixtures.length) {
    return normalizeFixtureMap(payload.qlcFixtures);
  }
  if (!Array.isArray(payload.fixtures) || !payload.fixtures.length) {
    throw new Error("Setup must contain qlcFixtures or fixtures");
  }
  return normalizeFixtureMap(payload.fixtures.map((fixture) => fixtureFromSetupFixture(fixture)));
}

function fixtureFromSetupFixture(fixture) {
  const converted = {
    id: fixture.id,
    label: fixture.label || fixture.id,
    address: fixture.startChannel ?? fixture.address,
    channels: fixture.channelCount ?? fixture.channels,
    map: {},
    rgb: {},
  };
  const roleCounts = {};
  const channels = Array.isArray(fixture.channels) ? fixture.channels : [];
  for (const channel of channels.sort((left, right) => Number(left.local) - Number(right.local))) {
    const role = channel.role;
    const local = Number(channel.local);
    if (!role || role === "unknown" || role === "off" || local <= 0) continue;
    roleCounts[role] = (roleCounts[role] || 0) + 1;
    const occurrence = roleCounts[role];
    if (role === "red" || role === "green" || role === "blue") {
      const key = { red: "r", green: "g", blue: "b" }[role];
      if (occurrence === 1) {
        converted.rgb[key] = local;
        converted.map[key] = local;
      } else if (occurrence === 2) {
        converted.rgb2 = converted.rgb2 || {};
        converted.rgb2[key] = local;
        converted.map[`${key}2`] = local;
      }
    } else if (role === "white") {
      const key = occurrence === 1 ? "white" : "white2";
      converted[key] = local;
      converted.map[key] = local;
    } else {
      converted[role] = local;
      converted.map[role] = local;
    }
  }
  if (Object.keys(converted.rgb).length === 0) delete converted.rgb;
  return converted;
}

function normalizeFixtureMap(fixtures) {
  return fixtures.map((fixture) => {
    if (!fixture.id || fixture.address === undefined || fixture.channels === undefined) {
      throw new Error("Each fixture needs id, address and channels");
    }
    return {
      ...fixture,
      address: Number(fixture.address),
      channels: Number(fixture.channels),
      rgb: fixture.rgb ? { ...fixture.rgb } : undefined,
      rgb2: fixture.rgb2 ? { ...fixture.rgb2 } : undefined,
    };
  });
}

function fixtureMapDiagnostics(fixtures) {
  const seen = new Map();
  const mappedChannels = [];
  const outOfRange = [];
  const overlaps = [];
  for (const fixture of fixtures) {
    for (let local = 1; local <= Number(fixture.channels); local += 1) {
      const channel = Number(fixture.address) + local - 1;
      mappedChannels.push(channel);
      if (channel < 1 || channel > 512) outOfRange.push({ fixtureId: fixture.id, channel });
      if (seen.has(channel)) overlaps.push({ channel, fixtureIds: [seen.get(channel), fixture.id] });
      seen.set(channel, fixture.id);
    }
  }
  return { mappedChannels: Array.from(new Set(mappedChannels)).sort((a, b) => a - b), outOfRange, overlaps };
}

function fallbackPresetSummary() {
  return {
    name: "Built-in six-light test preset",
    path: null,
    valid: true,
    error: null,
    fixtureCount: 6,
    mappedChannelCount: 36,
    mappedChannels: [],
    diagnostics: { outOfRange: [], overlaps: [], mappedChannels: [] },
    lastModified: null,
  };
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

module.exports = {
  LightSetupManager,
  fixtureMapFromPayload,
  fixtureMapDiagnostics,
  DEFAULT_LIBRARY_DIR,
  SELECTION_FILE,
};
