"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const ROUTE_STATE = Object.freeze({
  INACTIVE: "inactive",
  ACTIVE: "active",
  RESTORED: "restored",
  ERROR: "error",
});

class MacAudioRouteManager {
  constructor({
    statePath,
    logger = () => {},
    platform = process.platform,
    desiredOutput = "DMX Multi-Output",
    blackHoleName = "BlackHole 2ch",
  }) {
    this.statePath = statePath;
    this.logger = logger;
    this.platform = platform;
    this.desiredOutput = desiredOutput;
    this.blackHoleName = blackHoleName;
    this.routeMemory = this.loadState();
    this.status = this.emptyStatus();
  }

  async refreshStatus() {
    if (this.platform !== "darwin") {
      this.status = {
        ...this.emptyStatus(),
        routeState: ROUTE_STATE.ERROR,
        lastError: "BlackHole Legacy / Beta audio route is macOS-only.",
        setupComplete: false,
      };
      return this.status;
    }

    const switchAudioSourcePath = await detectSwitchAudioSource();
    if (!switchAudioSourcePath) {
      this.status = this.withInstructions({
        ...this.emptyStatus(),
        switchAudioSourceInstalled: false,
        routeState: this.routeMemory.routeState || ROUTE_STATE.INACTIVE,
        previousOutput: this.routeMemory.previousOutput || null,
        changedByElectron: Boolean(this.routeMemory.changedByElectron),
        lastError: "SwitchAudioSource is missing.",
        setupComplete: false,
      });
      return this.status;
    }

    const [availableOutputs, availableInputs, currentOutput] = await Promise.all([
      listSwitchAudioDevices(switchAudioSourcePath, "output"),
      listSwitchAudioDevices(switchAudioSourcePath, "input"),
      currentSwitchAudioDevice(switchAudioSourcePath, "output"),
    ]);

    const blackHoleDetected = availableInputs.includes(this.blackHoleName)
      || availableOutputs.includes(this.blackHoleName)
      || availableInputs.some((name) => name.includes("BlackHole"))
      || availableOutputs.some((name) => name.includes("BlackHole"));
    const multiOutputDetected = availableOutputs.includes(this.desiredOutput);
    const setupComplete = Boolean(blackHoleDetected && multiOutputDetected);
    let routeState = this.routeMemory.routeState || ROUTE_STATE.INACTIVE;

    if (this.routeMemory.changedByElectron && currentOutput === this.desiredOutput) {
      routeState = ROUTE_STATE.ACTIVE;
    } else if (!this.routeMemory.changedByElectron && this.routeMemory.routeState === ROUTE_STATE.RESTORED) {
      routeState = ROUTE_STATE.RESTORED;
    } else if (!setupComplete && this.routeMemory.lastError) {
      routeState = ROUTE_STATE.ERROR;
    } else if (currentOutput !== this.desiredOutput && routeState !== ROUTE_STATE.RESTORED) {
      routeState = ROUTE_STATE.INACTIVE;
    }

    this.status = this.withInstructions({
      platform: this.platform,
      modeLabel: "BlackHole Legacy / Beta audio route",
      futureModeLabel: "Future native system audio capture will use CoreAudio Tap.",
      microphoneNotice: "Microphone fallback is separate and is not used as system audio here.",
      routeState,
      switchAudioSourceInstalled: true,
      switchAudioSourcePath,
      currentOutput,
      availableOutputs,
      availableInputs,
      blackHoleDetected,
      dmxMultiOutputDetected: multiOutputDetected,
      changedByElectron: Boolean(this.routeMemory.changedByElectron),
      previousOutput: this.routeMemory.previousOutput || null,
      setupComplete,
      lastError: this.routeMemory.lastError || null,
    });
    return this.status;
  }

  async ensureLegacyRouteOnStart() {
    const status = await this.refreshStatus();
    if (this.platform !== "darwin") {
      return { ok: false, status, warning: status.lastError };
    }
    if (!status.switchAudioSourceInstalled || !status.blackHoleDetected || !status.dmxMultiOutputDetected) {
      this.routeMemory = {
        ...this.routeMemory,
        routeState: ROUTE_STATE.ERROR,
        lastError: "Legacy route setup incomplete.",
      };
      this.saveState();
      this.logger("legacyAudio", "automatic route activation warning: setup incomplete");
      return {
        ok: false,
        status: await this.refreshStatus(),
        warning: "Legacy route setup incomplete.",
      };
    }
    if (status.currentOutput === this.desiredOutput) {
      this.routeMemory = {
        ...this.routeMemory,
        routeState: ROUTE_STATE.ACTIVE,
        lastError: null,
      };
      this.saveState();
      this.logger("legacyAudio", `legacy route already active on ${this.desiredOutput}`);
      return { ok: true, status: await this.refreshStatus() };
    }

    this.routeMemory.previousOutput = status.currentOutput || null;
    this.routeMemory.changedByElectron = true;
    this.routeMemory.routeState = ROUTE_STATE.ACTIVE;
    this.routeMemory.lastError = null;
    this.saveState();

    try {
      await setSwitchAudioDevice(status.switchAudioSourcePath, "output", this.desiredOutput);
      this.logger("legacyAudio", `switched macOS output from "${status.currentOutput}" to "${this.desiredOutput}"`);
      return { ok: true, status: await this.refreshStatus() };
    } catch (error) {
      this.routeMemory.routeState = ROUTE_STATE.ERROR;
      this.routeMemory.lastError = `Failed to switch output: ${error.message}`;
      this.saveState();
      this.logger("legacyAudio", this.routeMemory.lastError);
      return { ok: false, status: await this.refreshStatus(), warning: this.routeMemory.lastError };
    }
  }

  async forceEnableLegacyRouting() {
    this.logger("legacyAudio", "manual legacy route activation requested");
    return this.ensureLegacyRouteOnStart();
  }

  async restorePreviousOutput({ reason = "restore requested" } = {}) {
    const status = await this.refreshStatus();
    if (this.platform !== "darwin") {
      return { ok: false, status, warning: status.lastError };
    }
    if (!status.switchAudioSourceInstalled) {
      return { ok: false, status, warning: "SwitchAudioSource is missing." };
    }
    if (!this.routeMemory.previousOutput) {
      this.routeMemory.changedByElectron = false;
      this.routeMemory.routeState = ROUTE_STATE.RESTORED;
      this.routeMemory.lastError = null;
      this.saveState();
      return { ok: true, status: await this.refreshStatus() };
    }
    if (status.currentOutput === this.routeMemory.previousOutput) {
      this.routeMemory.changedByElectron = false;
      this.routeMemory.routeState = ROUTE_STATE.RESTORED;
      this.routeMemory.lastError = null;
      this.routeMemory.previousOutput = null;
      this.saveState();
      this.logger("legacyAudio", `restore skipped: output already back on "${status.currentOutput}"`);
      return { ok: true, status: await this.refreshStatus() };
    }

    try {
      await setSwitchAudioDevice(status.switchAudioSourcePath, "output", this.routeMemory.previousOutput);
      this.logger("legacyAudio", `${reason}: restored macOS output to "${this.routeMemory.previousOutput}"`);
      this.routeMemory.changedByElectron = false;
      this.routeMemory.routeState = ROUTE_STATE.RESTORED;
      this.routeMemory.lastError = null;
      this.routeMemory.previousOutput = null;
      this.saveState();
      return { ok: true, status: await this.refreshStatus() };
    } catch (error) {
      this.routeMemory.routeState = ROUTE_STATE.ERROR;
      this.routeMemory.lastError = `Restore failed: ${error.message}`;
      this.saveState();
      this.logger("legacyAudio", this.routeMemory.lastError);
      return { ok: false, status: await this.refreshStatus(), warning: this.routeMemory.lastError };
    }
  }

  async openAudioMidiSetup() {
    if (this.platform !== "darwin") {
      throw new Error("Audio MIDI Setup helper is available on macOS only.");
    }
    await execFileAsync("open", ["-a", "Audio MIDI Setup"]);
    this.logger("legacyAudio", "opened Audio MIDI Setup");
    return true;
  }

  getStatus() {
    return this.status;
  }

  emptyStatus() {
    return {
      platform: this.platform,
      modeLabel: "BlackHole Legacy / Beta audio route",
      futureModeLabel: "Future native system audio capture will use CoreAudio Tap.",
      microphoneNotice: "Microphone fallback is separate and is not used as system audio here.",
      routeState: ROUTE_STATE.INACTIVE,
      switchAudioSourceInstalled: false,
      switchAudioSourcePath: null,
      currentOutput: null,
      availableOutputs: [],
      availableInputs: [],
      blackHoleDetected: false,
      dmxMultiOutputDetected: false,
      changedByElectron: false,
      previousOutput: null,
      setupComplete: false,
      lastError: null,
      instructions: [],
    };
  }

  withInstructions(status) {
    const instructions = [];
    if (!status.switchAudioSourceInstalled) {
      instructions.push("Install SwitchAudioSource: brew install switchaudio-osx");
    }
    if (status.switchAudioSourceInstalled && !status.blackHoleDetected) {
      instructions.push("Install BlackHole 2ch.");
    }
    if (status.switchAudioSourceInstalled && !status.dmxMultiOutputDetected) {
      instructions.push(
        "Open Audio MIDI Setup, click +, create Multi-Output Device, include BlackHole 2ch and your real output, rename it exactly \"DMX Multi-Output\", then return to the app.",
      );
    }
    return {
      ...status,
      instructions,
    };
  }

  loadState() {
    try {
      if (!this.statePath || !fs.existsSync(this.statePath)) {
        return {
          changedByElectron: false,
          previousOutput: null,
          routeState: ROUTE_STATE.INACTIVE,
          lastError: null,
        };
      }
      const raw = JSON.parse(fs.readFileSync(this.statePath, "utf8"));
      return {
        changedByElectron: Boolean(raw.changedByElectron),
        previousOutput: raw.previousOutput || null,
        routeState: raw.routeState || ROUTE_STATE.INACTIVE,
        lastError: raw.lastError || null,
      };
    } catch (_error) {
      return {
        changedByElectron: false,
        previousOutput: null,
        routeState: ROUTE_STATE.INACTIVE,
        lastError: null,
      };
    }
  }

  saveState() {
    if (!this.statePath) return;
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    fs.writeFileSync(this.statePath, JSON.stringify(this.routeMemory, null, 2));
  }
}

async function detectSwitchAudioSource() {
  try {
    const output = await execFileAsync("/bin/sh", ["-lc", "command -v SwitchAudioSource || true"]);
    return output.trim() || null;
  } catch (_error) {
    return null;
  }
}

async function listSwitchAudioDevices(binaryPath, type) {
  const output = await execFileAsync(binaryPath, ["-a", "-t", type]);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function currentSwitchAudioDevice(binaryPath, type) {
  const output = await execFileAsync(binaryPath, ["-c", "-t", type]);
  return output.trim() || null;
}

async function setSwitchAudioDevice(binaryPath, type, name) {
  await execFileAsync(binaryPath, ["-s", name, "-t", type]);
}

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 2500 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error((stderr || error.message || "").trim() || "command failed"));
        return;
      }
      resolve(String(stdout || "").trim());
    });
  });
}

module.exports = {
  LegacyAudioRouteManager: MacAudioRouteManager,
  MacAudioRouteManager,
  ROUTE_STATE,
};
