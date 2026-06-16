"use strict";

const { AudioCaptureDriver } = require("../AudioCaptureDriver");
const { AUDIO_SOURCE_TYPES, USER_VISIBLE_SOURCE_LABELS } = require("../sourceTypes");

class MicrophoneFallbackDriver extends AudioCaptureDriver {
  constructor() {
    super({
      sourceType: AUDIO_SOURCE_TYPES.MICROPHONE_FALLBACK,
      label: USER_VISIBLE_SOURCE_LABELS[AUDIO_SOURCE_TYPES.MICROPHONE_FALLBACK],
    });
  }

  async start(config = {}) {
    if (!config.explicitUserConsent) {
      throw new Error("Microphone fallback requires explicit user consent.");
    }
    throw new Error("Microphone fallback is intentionally not implemented in the scaffold.");
  }

  getStatus() {
    return {
      sourceType: this.sourceType,
      label: this.label,
      state: "placeholder",
      warning: "Microphone captures room sound and must be selected explicitly.",
    };
  }
}

module.exports = {
  MicrophoneFallbackDriver,
};
