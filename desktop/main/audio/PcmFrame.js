"use strict";

function createPcmFrame({
  sourceType,
  sourceId,
  sequence,
  timestampSeconds,
  sampleRate,
  channelCount,
  data,
}) {
  if (!(data instanceof Float32Array)) {
    throw new TypeError("PcmFrame data must be a Float32Array.");
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError("PcmFrame sampleRate must be positive.");
  }
  if (!Number.isInteger(channelCount) || channelCount <= 0) {
    throw new RangeError("PcmFrame channelCount must be a positive integer.");
  }
  const frameCount = Math.floor(data.length / channelCount);
  const meter = levelMeter(data);
  return Object.freeze({
    sourceType,
    sourceId: sourceId || "default",
    sequence: Number(sequence || 0),
    timestampSeconds: Number(timestampSeconds || 0),
    sampleRate,
    channelCount,
    sampleFormat: "float32",
    layout: "interleaved",
    frameCount,
    data,
    rms: meter.rms,
    peak: meter.peak,
  });
}

function levelMeter(data) {
  if (!data.length) return { rms: 0, peak: 0 };
  let sum = 0;
  let peak = 0;
  for (const sample of data) {
    const value = Math.max(-1, Math.min(1, Number(sample) || 0));
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  return {
    rms: Math.sqrt(sum / data.length),
    peak,
  };
}

module.exports = {
  createPcmFrame,
  levelMeter,
};
