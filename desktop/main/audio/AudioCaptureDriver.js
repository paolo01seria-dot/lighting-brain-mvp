"use strict";

class AudioCaptureDriver {
  constructor({ sourceType, label }) {
    this.sourceType = sourceType;
    this.label = label;
  }

  async start() {
    throw new Error(`${this.label} is not implemented yet.`);
  }

  async stop() {}

  async listDevices() {
    return [];
  }

  getStatus() {
    return {
      sourceType: this.sourceType,
      label: this.label,
      state: "idle",
      warning: null,
    };
  }

  onPcmFrame() {
    return () => {};
  }

  getLevelMeter() {
    return { rms: 0, peak: 0 };
  }
}

module.exports = {
  AudioCaptureDriver,
};
