"use strict";

const { AudioCaptureDriver } = require("../AudioCaptureDriver");
const { createPcmFrame } = require("../PcmFrame");
const { AUDIO_SOURCE_TYPES, USER_VISIBLE_SOURCE_LABELS } = require("../sourceTypes");

class MockAudioCaptureDriver extends AudioCaptureDriver {
  constructor() {
    super({
      sourceType: AUDIO_SOURCE_TYPES.MOCK,
      label: USER_VISIBLE_SOURCE_LABELS[AUDIO_SOURCE_TYPES.MOCK],
    });
    this.callbacks = new Set();
    this.timer = null;
    this.sequence = 0;
    this.startedAt = 0;
    this.lastMeter = { rms: 0, peak: 0 };
  }

  async start(config = {}) {
    const sampleRate = Number(config.sampleRate || 48000);
    const frameCount = Number(config.frameCount || 480);
    this.startedAt = Date.now();
    this.sequence = 0;
    this.timer = setInterval(() => {
      const data = new Float32Array(frameCount);
      const frequency = 220;
      for (let index = 0; index < frameCount; index += 1) {
        const t = (this.sequence * frameCount + index) / sampleRate;
        data[index] = Math.sin(2 * Math.PI * frequency * t) * 0.18;
      }
      const frame = createPcmFrame({
        sourceType: this.sourceType,
        sourceId: "mock-sine",
        sequence: this.sequence,
        timestampSeconds: (Date.now() - this.startedAt) / 1000,
        sampleRate,
        channelCount: 1,
        data,
      });
      this.lastMeter = { rms: frame.rms, peak: frame.peak };
      this.sequence += 1;
      for (const callback of this.callbacks) callback(frame);
    }, 10);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.callbacks.clear();
    this.lastMeter = { rms: 0, peak: 0 };
  }

  getStatus() {
    return {
      sourceType: this.sourceType,
      label: this.label,
      state: this.timer ? "running" : "idle",
      warning: "Mock audio is for desktop scaffold tests only.",
    };
  }

  onPcmFrame(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getLevelMeter() {
    return this.lastMeter;
  }
}

module.exports = {
  MockAudioCaptureDriver,
};
