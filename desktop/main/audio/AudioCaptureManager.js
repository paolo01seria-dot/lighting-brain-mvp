"use strict";

class AudioCaptureManager {
  constructor({ drivers }) {
    this.drivers = new Map(drivers.map((driver) => [driver.sourceType, driver]));
    this.activeDriver = null;
    this.status = {
      state: "idle",
      sourceType: null,
      label: null,
      warning: null,
    };
  }

  async listSources() {
    return Array.from(this.drivers.values()).map((driver) => ({
      sourceType: driver.sourceType,
      label: driver.label,
      status: driver.getStatus(),
    }));
  }

  async start(sourceType, config = {}) {
    const driver = this.drivers.get(sourceType);
    if (!driver) {
      throw new Error(`Unknown audio source type: ${sourceType}`);
    }
    if (sourceType === "microphone_fallback" && !config.explicitUserConsent) {
      throw new Error("Microphone fallback requires explicit user consent.");
    }
    await this.stop();
    await driver.start(config);
    this.activeDriver = driver;
    this.status = {
      ...driver.getStatus(),
      state: "running",
    };
    return this.status;
  }

  async stop() {
    if (!this.activeDriver) {
      this.status = {
        state: "idle",
        sourceType: null,
        label: null,
        warning: null,
      };
      return this.status;
    }
    await this.activeDriver.stop();
    this.activeDriver = null;
    this.status = {
      state: "idle",
      sourceType: null,
      label: null,
      warning: null,
    };
    return this.status;
  }

  getStatus() {
    if (!this.activeDriver) return this.status;
    return {
      ...this.activeDriver.getStatus(),
      state: "running",
    };
  }

  onPcmFrame(callback) {
    if (!this.activeDriver) return () => {};
    return this.activeDriver.onPcmFrame(callback);
  }
}

module.exports = {
  AudioCaptureManager,
};
