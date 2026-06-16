"use strict";

const AUDIO_SOURCE_TYPES = Object.freeze({
  SYSTEM_OUTPUT_AUDIO: "system_output_audio",
  APP_OUTPUT_AUDIO: "app_output_audio",
  BLACKHOLE_LEGACY: "blackhole_legacy",
  MICROPHONE_FALLBACK: "microphone_fallback",
  MOCK: "mock",
});

const USER_VISIBLE_SOURCE_LABELS = Object.freeze({
  [AUDIO_SOURCE_TYPES.SYSTEM_OUTPUT_AUDIO]: "System Output Audio",
  [AUDIO_SOURCE_TYPES.APP_OUTPUT_AUDIO]: "App Output Audio",
  [AUDIO_SOURCE_TYPES.BLACKHOLE_LEGACY]: "BlackHole Legacy / Debug",
  [AUDIO_SOURCE_TYPES.MICROPHONE_FALLBACK]: "Microphone Fallback",
  [AUDIO_SOURCE_TYPES.MOCK]: "Mock Audio",
});

module.exports = {
  AUDIO_SOURCE_TYPES,
  USER_VISIBLE_SOURCE_LABELS,
};
