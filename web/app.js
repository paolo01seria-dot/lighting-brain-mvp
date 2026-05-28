const colors = [
  { name: "red", value: [255, 76, 91] },
  { name: "amber", value: [255, 196, 87] },
  { name: "green", value: [88, 221, 130] },
  { name: "blue", value: [88, 123, 255] },
  { name: "white", value: [245, 247, 248] },
];

const genreProfiles = {
  house: { smoothing: 0.48, pulse: 1.28, palette: [1, 2, 3, 4], motion: "bounce", chase: 1.0, threshold: 0.062, decay: 0.78, spread: 2 },
  techno: { smoothing: 0.54, pulse: 1.34, palette: [3, 4, 0], motion: "scan", chase: 1.4, threshold: 0.058, decay: 0.82, spread: 2 },
  metal: { smoothing: 0.36, pulse: 1.58, palette: [0, 4, 3], motion: "hits", chase: 1.95, threshold: 0.055, decay: 0.7, spread: 3 },
  electronic: { smoothing: 0.48, pulse: 1.35, palette: [2, 3, 4, 0], motion: "spiral", chase: 1.25, threshold: 0.06, decay: 0.76, spread: 2 },
  garage: { smoothing: 0.44, pulse: 1.3, palette: [1, 2, 0, 4], motion: "stagger", chase: 1.15, threshold: 0.058, decay: 0.74, spread: 2 },
};

const elements = {
  inputSource: document.querySelector("#inputSource"),
  audioFile: document.querySelector("#audioFile"),
  audioDevice: document.querySelector("#audioDevice"),
  trackLabel: document.querySelector("#trackLabel"),
  outputTarget: document.querySelector("#outputTarget"),
  outputLabel: document.querySelector("#outputLabel"),
  genreProfile: document.querySelector("#genreProfile"),
  playButton: document.querySelector("#playButton"),
  stopButton: document.querySelector("#stopButton"),
  stateLabel: document.querySelector("#stateLabel"),
  energyLabel: document.querySelector("#energyLabel"),
  energyFill: document.querySelector("#energyFill"),
  trackOverview: document.querySelector("#trackOverview"),
  liveSpectrum: document.querySelector("#liveSpectrum"),
  eventLog: document.querySelector("#eventLog"),
  lightCount: document.querySelector("#lightCount"),
  differentiation: document.querySelector("#differentiation"),
  differentiationValue: document.querySelector("#differentiationValue"),
  seekSlider: document.querySelector("#seekSlider"),
  currentTimeLabel: document.querySelector("#currentTimeLabel"),
  durationLabel: document.querySelector("#durationLabel"),
  resetLayoutButton: document.querySelector("#resetLayoutButton"),
  stage: document.querySelector("#stage"),
};

let audioContext;
let analyser;
let sourceNode;
let audioElement;
let mediaElementSource;
let objectUrl;
let mediaStream;
let mediaSourceNode;
let audioBuffer;
let loadedFileName = "";
let startedAt = 0;
let pausedAt = 0;
let animationFrame;
let isPlaying = false;
let inputMode = "file";
let overviewCacheCanvas;
let previousSpectrum;
let sceneVariant = 0;
let lastSceneCategory = "ambient_no_beat";
let smoothedEnergy = 0;
let previousEnergy = 0;
let previousLow = 0;
let previousMid = 0;
let previousHigh = 0;
let previousRms = 0;
let musicalClock = {
  lastPulseTime: null,
  interval: null,
  confidence: 0,
  source: "none",
};
let frameCounter = 0;
let lastEventSecond = -1;
let categoryCounters = {};
let currentSceneByCategory = {};

let lights = [];
let lightStates = [];
let positions = [];
let dragging = null;

function buildLights(count, keepPositions = true) {
  const nextCount = clamp(Math.round(count), 1, 32);
  elements.lightCount.value = String(nextCount);
  if (!keepPositions || positions.length !== nextCount) {
    positions = defaultPositions(nextCount);
  }
  elements.stage.querySelectorAll(".light").forEach((light) => light.remove());
  lights = [];
  lightStates = [];

  positions.forEach((position, index) => {
    const light = document.createElement("button");
    light.type = "button";
    light.className = "light";
    light.dataset.index = String(index);
    light.style.left = `${position.x}%`;
    light.style.top = `${position.y}%`;
    light.addEventListener("pointerdown", startDrag);
    elements.stage.appendChild(light);
    lights.push(light);
    lightStates.push({
      intensity: 0,
      age: 999,
      colorIndex: index % colors.length,
    });
  });

  renderLights();
}

function defaultPositions(count) {
  const result = [];
  const centerX = 50;
  const centerY = 52;
  const radiusX = 32;
  const radiusY = 28;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    result.push({
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    });
  }
  return result;
}

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

async function loadAudioFile(file) {
  await ensureAudioContext();
  stopDeviceInput();
  stopPlayback({ resetPosition: true });
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrl = URL.createObjectURL(file);
  ensureAudioElement();
  audioElement.src = objectUrl;
  audioElement.load();

  const data = await file.arrayBuffer();
  try {
    audioBuffer = await audioContext.decodeAudioData(data.slice(0));
  } catch (error) {
    audioBuffer = null;
    logEvent("overview unavailable");
  }

  await waitForAudioMetadata();
  loadedFileName = file.name;
  overviewCacheCanvas = null;
  pausedAt = 0;
  elements.trackLabel.textContent = loadedFileName;
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.seekSlider.disabled = false;
  drawTrackOverview();
  updatePlayerTime();
  setState("Ready");
  logEvent(`loaded ${file.name}`);
}

function ensureAudioElement() {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = "auto";
    audioElement.addEventListener("ended", () => {
      stopPlayback({ resetPosition: true });
    });
  }
  if (!mediaElementSource) {
    mediaElementSource = audioContext.createMediaElementSource(audioElement);
    mediaElementSource.connect(analyser);
    mediaElementSource.connect(audioContext.destination);
  }
}

function waitForAudioMetadata() {
  if (!audioElement) return Promise.resolve();
  if (Number.isFinite(audioElement.duration) && audioElement.duration > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audioElement.removeEventListener("loadedmetadata", onMetadata);
      audioElement.removeEventListener("error", onError);
    };
    const onMetadata = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Audio file not supported"));
    };
    audioElement.addEventListener("loadedmetadata", onMetadata, { once: true });
    audioElement.addEventListener("error", onError, { once: true });
  });
}

async function playAudio() {
  if (!audioElement) return;
  await ensureAudioContext();
  cancelAnimationFrame(animationFrame);
  stopSourceNode();
  if (pausedAt >= getAudioDuration()) {
    pausedAt = 0;
  }
  audioElement.currentTime = pausedAt;
  startedAt = audioContext.currentTime - pausedAt;
  await audioElement.play();
  isPlaying = true;
  setState("Playing");
  elements.playButton.textContent = "Pause";
  elements.stopButton.disabled = false;
  animate();
}

function pauseAudio() {
  if (!audioElement || !audioContext) return;
  pausedAt = clamp(audioElement.currentTime, 0, getAudioDuration());
  audioElement.pause();
  isPlaying = false;
  cancelAnimationFrame(animationFrame);
  setState("Paused");
  elements.playButton.textContent = "Play";
  updatePlayerTime();
}

function stopSourceNode() {
  if (sourceNode) {
    try {
      sourceNode.onended = null;
      sourceNode.stop();
    } catch (_error) {
      // Source may already be stopped.
    }
  }
  sourceNode = null;
}

function stopPlayback(options = {}) {
  const { resetPosition = true, keepLights = false } = options;
  stopSourceNode();
  if (audioElement) {
    audioElement.pause();
    if (resetPosition) {
      audioElement.currentTime = 0;
    }
  }
  isPlaying = false;
  if (resetPosition) {
    pausedAt = 0;
  }
  cancelAnimationFrame(animationFrame);
  smoothedEnergy = 0;
  previousEnergy = 0;
  previousLow = 0;
  previousMid = 0;
  previousHigh = 0;
  previousRms = 0;
  previousSpectrum = null;
  sceneVariant = 0;
  lastSceneCategory = "ambient_no_beat";
  musicalClock = {
    lastPulseTime: null,
    interval: null,
    confidence: 0,
    source: "none",
  };
  frameCounter = 0;
  lastEventSecond = -1;
  categoryCounters = {};
  currentSceneByCategory = {};
  setState(hasLoadedAudio() ? "Ready" : "Idle");
  elements.playButton.disabled = !hasLoadedAudio();
  elements.playButton.textContent = "Play";
  elements.stopButton.disabled = !hasLoadedAudio();
  if (!keepLights) blackoutLights();
  updateMeter(0);
  updatePlayerTime();
}

function animate() {
  if (!analyser || !isPlaying) return;
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeData = new Uint8Array(analyser.fftSize);
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);
  const profile = genreProfiles[elements.genreProfile.value];
  analyser.smoothingTimeConstant = profile.smoothing;

  const spectralFlux = getSpectralFlux(frequencyData);
  const inputGain = inputMode === "mic_device" ? 5.8 : 2.75;
  const rawEnergy = clamp((average(frequencyData) / 255) * inputGain + spectralFlux * 0.72, 0, 1);
  const rms = getRms(timeData);
  smoothedEnergy = smoothedEnergy * 0.32 + rawEnergy * 0.68;
  const energy = Math.min(1, smoothedEnergy * profile.pulse);
  drawLiveSpectrum(frequencyData);
  updateLights(frequencyData, energy, rms, profile, spectralFlux);
  updateMeter(energy);
  updatePlayerTime();
  maybeLogSignal(energy);
  previousSpectrum = new Uint8Array(frequencyData);

  animationFrame = requestAnimationFrame(animate);
}

function updateLights(frequencyData, energy, rms, profile, spectralFlux) {
  const bands = getBands(frequencyData, 5);
  const time = audioContext ? audioContext.currentTime - startedAt : 0;
  const low = bands[0] ?? 0;
  const mid = bands[2] ?? 0;
  const high = bands[4] ?? 0;
  const dominantBand = indexOfMax(bands);
  const energyDelta = energy - previousEnergy;
  const lowDelta = low - previousLow;
  const midDelta = mid - previousMid;
  const highDelta = high - previousHigh;
  const rmsDelta = rms - previousRms;
  const lowOnset = Math.max(0, lowDelta * 1.45 + rmsDelta * 1.4);
  const tonalOnset = Math.max(0, midDelta * 2.3 + highDelta * 1.75 + spectralFlux * 2.55 + energyDelta * 0.58);
  const onsetStrength = Math.max(0, energyDelta * 1.1 + lowOnset + tonalOnset + high * 0.055);
  updateMusicalClock({
    time,
    lowOnset,
    tonalOnset,
    energy,
    low,
    mid,
    high,
  });
  const clockPulse = shouldTriggerClockPulse(time);
  const isOnset = onsetStrength > profile.threshold || clockPulse;
  const isStrongHit = onsetStrength > profile.threshold * 3.2 || rmsDelta > 0.12;

  decayLightStates(profile.decay);

  if (isOnset) {
    triggerPattern({
      profile,
      time,
      energy,
      low,
      mid,
      high,
      dominantBand,
      strong: isStrongHit,
      clockSource: musicalClock.source,
      category: categoryForEnergy(energy),
    });
  } else if (shouldHoldSparseChase(time, profile, energy)) {
    triggerPattern({
      profile,
      time,
      energy: energy * 0.72,
      low,
      mid,
      high,
      dominantBand,
      strong: false,
      sparse: true,
      clockSource: musicalClock.source,
      category: categoryForEnergy(energy),
    });
  }

  renderLights();
  previousEnergy = energy;
  previousLow = low;
  previousMid = mid;
  previousHigh = high;
  previousRms = rms;
  frameCounter += 1;
}

function updateMusicalClock(reading) {
  const candidates = [
    { source: "bass", strength: reading.lowOnset, minEnergy: reading.low },
    { source: "mid_arpeggio", strength: reading.tonalOnset, minEnergy: reading.mid },
    { source: "high_pattern", strength: reading.tonalOnset * 0.82, minEnergy: reading.high },
  ];
  const candidate = candidates
    .filter((item) => item.strength > 0.012 && item.minEnergy > 0.01)
    .sort((a, b) => b.strength - a.strength)[0];

  if (!candidate) {
    musicalClock.confidence *= 0.992;
    return;
  }

  if (musicalClock.lastPulseTime === null) {
    musicalClock.lastPulseTime = reading.time;
    musicalClock.source = candidate.source;
    musicalClock.confidence = Math.max(musicalClock.confidence, 0.36);
    return;
  }

  const interval = reading.time - musicalClock.lastPulseTime;
  if (interval < 0.18) return;
  if (interval > 1.6) {
    musicalClock.lastPulseTime = reading.time;
    musicalClock.confidence *= 0.72;
    return;
  }

  const previousInterval = musicalClock.interval ?? interval;
  const stable = Math.abs(interval - previousInterval) < 0.2;
  musicalClock.interval = previousInterval * 0.68 + interval * 0.32;
  musicalClock.lastPulseTime = reading.time;
  musicalClock.source = candidate.source;
  musicalClock.confidence = clamp(
    musicalClock.confidence + (stable ? 0.18 : 0.06) + candidate.strength * 0.15,
    0,
    1
  );
}

function shouldTriggerClockPulse(time) {
  if (!musicalClock.interval || musicalClock.confidence < 0.16) return false;
  const elapsed = time - musicalClock.lastPulseTime;
  if (elapsed < musicalClock.interval * 0.92) return false;
  if (elapsed > musicalClock.interval * 1.35) return false;
  musicalClock.lastPulseTime = time;
  musicalClock.confidence *= 0.985;
  return true;
}

function decayLightStates(decay) {
  lightStates.forEach((state) => {
    state.intensity *= decay;
    state.age += 1;
    if (state.intensity < 0.025) {
      state.intensity = 0;
    }
  });
}

function shouldHoldSparseChase(time, profile, energy) {
  if (!isPlaying) return false;
  if (energy < 0.24 && musicalClock.source === "none") return false;
  const framesPerStep = Math.max(12, Math.round(38 / profile.chase));
  return frameCounter % framesPerStep === 0 && time > 0.25;
}

function triggerPattern(context) {
  const count = lights.length;
  if (!count) return;

  const activeIndexes = pickActiveLights(context.profile, context.time, count, context.strong, context.sparse, context.clockSource, context.energy);
  activeIndexes.forEach((index, order) => {
    const colorIndex = pickColorIndex(context, index, order);
    const clockBoost = context.clockSource && context.clockSource !== "none" ? 0.08 : 0;
    const base = context.strong ? 0.96 : context.sparse ? 0.48 : 0.62 + clockBoost;
    const spectral = context.low * 0.2 + context.mid * 0.14 + context.high * 0.18;
    lightStates[index].intensity = clamp(base + spectral - order * 0.06, 0.28, 1);
    lightStates[index].age = 0;
    lightStates[index].colorIndex = colorIndex;
  });

  blackoutNonActive(activeIndexes, context.strong ? 0.08 : 0.025);
}

function pickActiveLights(profile, time, count, strong, sparse = false, clockSource = "none", energy = 0) {
  const interval = Math.max(musicalClock.interval ?? 0.5, 0.24);
  const pulseStep = Math.floor(time / interval);
  const step = Math.floor(time * 3.6 * profile.chase);
  const differentiation = Number(elements.differentiation.value);
  const stableScene = differentiation >= 6;
  const weakGesture = !strong && (energy < 0.5 || clockSource === "mid_arpeggio");
  const spread = sparse || weakGesture
    ? 1
    : strong
      ? Math.min(count, profile.spread + (stableScene ? 0 : 1))
      : Math.min(count, profile.spread);

  if (weakGesture) {
    return musicalSingleOrPair(pulseStep, count, sparse);
  }

  if (clockSource === "high_pattern" && strong) {
    return symmetricalIndexes(pulseStep, count, Math.min(count, 4));
  }

  if (profile.motion === "hits") {
    if (strong) {
      return uniqueIndexes([step, step + 2, step + Math.floor(count / 2)], count);
    }
    return uniqueIndexes([step], count);
  }

  if (profile.motion === "scan") {
    return symmetricalIndexes(pulseStep, count, spread);
  }

  if (profile.motion === "stagger") {
    return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset * 2), count);
  }

  if (profile.motion === "spiral") {
    return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset * 3), count);
  }

  return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset), count);
}

function musicalSingleOrPair(step, count, sparse) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(step, count);
  if (sparse || step % 4 !== 0) {
    return [pair[step % 2]];
  }
  return pair;
}

function symmetricalIndexes(step, count, spread) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(step, count);
  const result = [...pair];
  let offset = 1;
  while (result.length < spread) {
    const nextPair = symmetricalPair(step + offset, count);
    nextPair.forEach((index) => {
      if (result.length < spread && !result.includes(index)) {
        result.push(index);
      }
    });
    offset += 1;
  }
  return result;
}

function symmetricalPair(step, count) {
  if (count <= 1) return [0];
  const pairPresets = buildSymmetryPairs(count);
  return pairPresets[step % pairPresets.length];
}

function buildSymmetryPairs(count) {
  const pairs = [];
  const topLeft = Math.max(0, Math.round(count * 0.88) % count);
  const topRight = Math.max(0, Math.round(count * 0.12) % count);
  pairs.push(uniqueIndexes([topLeft, topRight], count));
  pairs.push(uniqueIndexes([Math.round(count * 0.75), Math.round(count * 0.25)], count));
  pairs.push(uniqueIndexes([0, Math.floor(count / 2)], count));
  pairs.push(uniqueIndexes([Math.round(count * 0.62), Math.round(count * 0.38)], count));
  return pairs.filter((pair) => pair.length > 0);
}

function uniqueIndexes(values, count) {
  const result = [];
  values.forEach((value) => {
    const index = ((value % count) + count) % count;
    if (!result.includes(index)) {
      result.push(index);
    }
  });
  return result;
}

function pickColorIndex(context, index, order) {
  const { profile, time, dominantBand, energy, high, category } = context;
  const differentiation = Number(elements.differentiation.value);
  const categoryOffset = category === "high_energy_drop" ? 2 : category === "steady_bass_pulse" ? 1 : 0;
  const phrase = Math.floor(time / 8);
  if (high > 0.62 && order === 0) {
    return 4;
  }
  if (dominantBand >= 0 && dominantBand < colors.length && energy > 0.64 && differentiation <= 3) {
    return dominantBand;
  }
  const stablePhrase = differentiation >= 6 ? Math.floor(time / 16) : phrase;
  const chaseStep = Math.floor(time * profile.chase + index + stablePhrase + order + sceneVariant + categoryOffset);
  return profile.palette[chaseStep % profile.palette.length];
}

function blackoutNonActive(activeIndexes, maxIntensity) {
  lightStates.forEach((state, index) => {
    if (!activeIndexes.includes(index)) {
      state.intensity = Math.min(state.intensity, maxIntensity);
    }
  });
}

function blackoutLights() {
  lightStates.forEach((state) => {
    state.intensity = 0;
    state.age = 999;
  });
  renderLights();
}

function renderLights() {
  lights.forEach((light, index) => {
    const state = lightStates[index] ?? { intensity: 0, colorIndex: index % colors.length };
    const intensity = clamp(state.intensity, 0, 1);
    const [r, g, b] = colors[state.colorIndex].value;
    const visible = intensity > 0.04;

    light.style.background = visible
      ? `radial-gradient(circle at 50% 44%, rgba(255, 255, 255, ${0.18 + intensity * 0.42}) 0 12%, rgba(${r}, ${g}, ${b}, ${0.34 + intensity * 0.58}) 13% 48%, rgba(${r}, ${g}, ${b}, ${0.12 + intensity * 0.22}) 49% 72%, rgba(0, 0, 0, 0.58) 73%)`
      : "";
    light.style.opacity = visible ? (0.24 + intensity * 0.76).toFixed(3) : "0.82";
    light.style.boxShadow = visible
      ? `0 0 ${Math.round(10 + intensity * 54)}px rgba(${r}, ${g}, ${b}, ${intensity * 0.84})`
      : "";
    light.style.setProperty("--beam", visible ? `rgba(${r}, ${g}, ${b}, ${intensity})` : "transparent");
    light.style.setProperty("--beam-opacity", visible ? String(intensity * 0.42) : "0");
    light.classList.toggle("active", intensity > 0.62);
  });
}

function updateMeter(energy) {
  const percent = Math.round(energy * 100);
  elements.energyLabel.textContent = `${percent}%`;
  elements.energyFill.style.width = `${percent}%`;
}

function maybeLogSignal(energy) {
  const currentSecond = Math.floor(audioContext.currentTime - startedAt);
  if (currentSecond === lastEventSecond || currentSecond < 0) return;
  if (currentSecond % 2 !== 0) return;
  lastEventSecond = currentSecond;

  const output = elements.outputTarget.value;
  const genre = elements.genreProfile.value;
  const category = categoryForEnergy(energy);
  const sceneChanged = updateCategoryScene(category);
  const intent = category === "high_energy_drop" ? "peak_energy" : category === "steady_bass_pulse" ? "main_groove" : "low_energy";
  logEvent(`${formatTime(currentSecond)} ${output} ${genre} ${category} clock:${musicalClock.source}${sceneChanged ? " scene-change" : ""}`);
}

function categoryForEnergy(energy) {
  if (energy > 0.68) return "high_energy_drop";
  if (energy > 0.34) return "steady_bass_pulse";
  return "ambient_no_beat";
}

function updateCategoryScene(category) {
  const threshold = Number(elements.differentiation.value);
  categoryCounters[category] = (categoryCounters[category] ?? 0) + 1;
  if (category !== lastSceneCategory) {
    lastSceneCategory = category;
    sceneVariant = (sceneVariant + 1) % Math.max(2, threshold + 1);
    return true;
  }
  if (!currentSceneByCategory[category]) {
    currentSceneByCategory[category] = 0;
    return true;
  }
  if ((categoryCounters[category] - 1) % threshold === 0) {
    currentSceneByCategory[category] += 1;
    sceneVariant = (sceneVariant + 1) % Math.max(2, threshold + 1);
    return true;
  }
  return false;
}

function logEvent(message) {
  const previous = elements.eventLog.textContent.trim();
  const next = previous ? `${message}\n${previous}` : message;
  elements.eventLog.textContent = next.split("\n").slice(0, 9).join("\n");
}

function setState(value) {
  elements.stateLabel.textContent = value;
}

function average(values) {
  if (!values.length) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function getRms(values) {
  if (!values.length) return 0;
  let total = 0;
  for (const value of values) {
    const centered = (value - 128) / 128;
    total += centered * centered;
  }
  return Math.sqrt(total / values.length);
}

function getBands(values, bandCount) {
  if (!values.length) return Array.from({ length: bandCount }, () => 0);
  const bands = [];
  const bandSize = Math.floor(values.length / bandCount);
  for (let band = 0; band < bandCount; band += 1) {
    const start = band * bandSize;
    const end = band === bandCount - 1 ? values.length : start + bandSize;
    bands.push(average(values.slice(start, end)) / 255);
  }
  return bands;
}

function getSpectralFlux(values) {
  if (!previousSpectrum || !values.length) return 0;
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += Math.max(0, values[index] - previousSpectrum[index]);
  }
  return clamp(total / (values.length * 255), 0, 1);
}

function indexOfMax(values) {
  if (!values.length) return -1;
  let maxIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[maxIndex]) {
      maxIndex = index;
    }
  }
  return maxIndex;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function currentPlaybackTime() {
  if (inputMode === "mic_device") {
    return audioContext && isPlaying ? Math.max(0, audioContext.currentTime - startedAt) : 0;
  }
  if (!hasLoadedAudio()) return 0;
  if (audioElement) {
    return clamp(audioElement.currentTime || pausedAt, 0, getAudioDuration());
  }
  return clamp(pausedAt, 0, getAudioDuration());
}

function updatePlayerTime() {
  const current = currentPlaybackTime();
  const duration = inputMode === "mic_device" ? 0 : getAudioDuration();
  elements.currentTimeLabel.textContent = formatTime(Math.floor(current));
  elements.durationLabel.textContent = inputMode === "mic_device" ? "live" : formatTime(Math.floor(duration));
  drawOverviewPlayhead(current, duration);
  if (!hasLoadedAudio() || inputMode !== "file") {
    elements.seekSlider.value = "0";
    elements.seekSlider.disabled = true;
    return;
  }
  elements.seekSlider.disabled = false;
  elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
}

function hasLoadedAudio() {
  return Boolean(audioElement?.src);
}

function getAudioDuration() {
  if (audioElement && Number.isFinite(audioElement.duration)) {
    return audioElement.duration;
  }
  return audioBuffer?.duration ?? 0;
}

function drawTrackOverview() {
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;

  if (!audioBuffer) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#0d1011";
    context.fillRect(0, 0, width, height);
    drawOverviewGrid(context, width, height);
    return;
  }

  if (overviewCacheCanvas && overviewCacheCanvas.width === width && overviewCacheCanvas.height === height) {
    context.drawImage(overviewCacheCanvas, 0, 0);
    return;
  }

  overviewCacheCanvas = document.createElement("canvas");
  overviewCacheCanvas.width = width;
  overviewCacheCanvas.height = height;
  const overviewContext = overviewCacheCanvas.getContext("2d");
  overviewContext.fillStyle = "#0d1011";
  overviewContext.fillRect(0, 0, width, height);

  const data = audioBuffer.getChannelData(0);
  const samplesPerPixel = Math.max(1, Math.floor(data.length / width));
  drawOverviewGrid(overviewContext, width, height);

  for (let x = 0; x < width; x += 1) {
    const start = x * samplesPerPixel;
    const end = Math.min(data.length, start + samplesPerPixel);
    let peak = 0;
    let rms = 0;
    let crossings = 0;
    let previous = data[start] ?? 0;

    for (let index = start; index < end; index += 1) {
      const value = data[index];
      const absolute = Math.abs(value);
      peak = Math.max(peak, absolute);
      rms += value * value;
      if ((previous <= 0 && value > 0) || (previous >= 0 && value < 0)) {
        crossings += 1;
      }
      previous = value;
    }

    const windowSize = Math.max(1, end - start);
    rms = Math.sqrt(rms / windowSize);
    const brightness = clamp(crossings / Math.max(12, windowSize * 0.18), 0, 1);
    const center = height * 0.5;
    const lowHeight = Math.max(1, peak * height * 0.4);
    const midHeight = Math.max(1, rms * height * 1.15);
    const highHeight = Math.max(1, brightness * rms * height * 0.86);

    overviewContext.fillStyle = `rgba(79, 195, 177, ${0.18 + rms * 1.6})`;
    overviewContext.fillRect(x, center - midHeight, 1, midHeight * 2);
    overviewContext.fillStyle = `rgba(255, 196, 87, ${0.16 + peak * 0.62})`;
    overviewContext.fillRect(x, center - lowHeight * 0.5, 1, lowHeight);
    overviewContext.fillStyle = `rgba(245, 247, 248, ${0.08 + highHeight / height})`;
    overviewContext.fillRect(x, Math.max(0, center - lowHeight - highHeight), 1, highHeight);
  }
  context.drawImage(overviewCacheCanvas, 0, 0);
}

function drawOverviewGrid(context, width, height) {
  context.strokeStyle = "rgba(255, 255, 255, 0.06)";
  context.lineWidth = 1;
  for (let line = 1; line < 4; line += 1) {
    const y = (height / 4) * line;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawOverviewPlayhead(current, duration) {
  if (!audioBuffer || inputMode !== "file") return;
  drawTrackOverview();
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  if (overviewCacheCanvas) {
    context.drawImage(overviewCacheCanvas, 0, 0);
  }
  const progress = clamp(current / Math.max(duration, 0.001), 0, 1);
  const x = Math.round(progress * canvas.width);
  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
  context.lineWidth = Math.max(1, window.devicePixelRatio || 1);
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, canvas.height);
  context.stroke();
}

function drawLiveSpectrum(frequencyData) {
  const canvas = elements.liveSpectrum;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.fillStyle = "rgba(13, 16, 17, 0.34)";
  context.fillRect(0, 0, width, height);
  drawOverviewGrid(context, width, height);

  const bars = 42;
  const gap = Math.max(1, Math.round(2 * ratio));
  const barWidth = Math.max(2, Math.floor((width - gap * (bars - 1)) / bars));
  const binsPerBar = Math.max(1, Math.floor(frequencyData.length / bars));
  for (let bar = 0; bar < bars; bar += 1) {
    const start = bar * binsPerBar;
    const end = Math.min(frequencyData.length, start + binsPerBar);
    let value = 0;
    for (let index = start; index < end; index += 1) {
      value += frequencyData[index];
    }
    value = value / Math.max(1, end - start) / 255;
    const boosted = clamp(value * (inputMode === "mic_device" ? 3.6 : 2.1), 0, 1);
    const x = bar * (barWidth + gap);
    const barHeight = Math.max(2, boosted * height * 0.9);
    const hue = bar < bars * 0.28 ? "255, 196, 87" : bar < bars * 0.66 ? "79, 195, 177" : "245, 247, 248";
    context.fillStyle = `rgba(${hue}, ${0.2 + boosted * 0.72})`;
    context.fillRect(x, height - barHeight, barWidth, barHeight);
  }
}

async function seekToSliderValue(value) {
  if (!hasLoadedAudio() || inputMode !== "file") return;
  const wasPlaying = isPlaying;
  pausedAt = (Number(value) / 1000) * getAudioDuration();
  if (audioElement) {
    audioElement.currentTime = pausedAt;
  }
  if (wasPlaying) {
    cancelAnimationFrame(animationFrame);
    await playAudio();
  } else {
    updatePlayerTime();
  }
}

async function toggleTransport() {
  if (inputMode === "mic_device") {
    if (isPlaying) {
      stopDeviceInput();
    } else {
      await startDeviceInput();
    }
    return;
  }

  if (isPlaying) {
    pauseAudio();
  } else {
    await playAudio();
  }
}

function setInputMode(mode) {
  inputMode = mode;
  const fileMode = mode === "file";
  document.body.classList.toggle("is-mic-mode", mode === "mic_device");
  elements.audioFile.disabled = !fileMode;
  elements.audioFile.closest(".file-control").classList.toggle("disabled", !fileMode);
  elements.audioDevice.disabled = fileMode;
  if (fileMode) {
    stopDeviceInput();
    setState(hasLoadedAudio() ? "Ready" : "Idle");
    elements.trackLabel.textContent = loadedFileName || "No track loaded";
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !hasLoadedAudio();
    elements.stopButton.disabled = !hasLoadedAudio();
  } else {
    stopPlayback({ resetPosition: false, keepLights: true });
    setState("Mic ready");
    elements.trackLabel.textContent = "Mic Device";
    elements.playButton.textContent = "Listen";
    elements.playButton.disabled = false;
    elements.stopButton.disabled = true;
    refreshAudioDevices();
  }
  updatePlayerTime();
}

async function refreshAudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    elements.audioDevice.innerHTML = '<option value="">Audio devices unavailable</option>';
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => {
      if (device.kind !== "audioinput") return false;
      const label = device.label.toLowerCase();
      if (label.includes("zoom")) return false;
      if (label.includes("virtual")) return false;
      return true;
    });
    const previous = elements.audioDevice.value;
    elements.audioDevice.innerHTML = '<option value="">Default audio input</option>';
    audioInputs.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = normalizeInputDeviceName(device.label, index);
      elements.audioDevice.appendChild(option);
    });
    elements.audioDevice.value = previous;
  } catch (error) {
    logEvent(`mic list ${error.message}`);
  }
}

function normalizeInputDeviceName(label, index) {
  const clean = label.trim();
  if (!clean) return index === 0 ? "MacBook Air microphone" : `External mic ${index}`;
  if (/macbook|built-in|integrated|microphone/i.test(clean)) {
    return "MacBook Air microphone";
  }
  return clean;
}

async function startDeviceInput() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setState("Mic error");
    logEvent("Mic Device richiede localhost o HTTPS");
    return;
  }

  await ensureAudioContext();
  stopPlayback({ resetPosition: false, keepLights: true });
  stopDeviceInput(false);
  elements.playButton.disabled = true;
  elements.stopButton.disabled = true;
  setState("Opening mic");

  const selectedDevice = elements.audioDevice.value;
  const constraints = selectedDevice
    ? { audio: { deviceId: { exact: selectedDevice }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
    : { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  mediaSourceNode = audioContext.createMediaStreamSource(mediaStream);
  mediaSourceNode.connect(analyser);
  startedAt = audioContext.currentTime;
  pausedAt = 0;
  isPlaying = true;
  elements.playButton.textContent = "Pause";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.trackLabel.textContent = "Mic Device";
  setState("Listening");
  await refreshAudioDevices();
  animate();
  logEvent("mic device live");
}

function stopDeviceInput(resetUi = true) {
  if (mediaSourceNode) {
    mediaSourceNode.disconnect();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  mediaSourceNode = null;
  mediaStream = null;
  if (inputMode === "mic_device") {
    isPlaying = false;
    cancelAnimationFrame(animationFrame);
    if (resetUi) {
      setState("Mic ready");
      elements.trackLabel.textContent = "Mic Device";
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      updateMeter(0);
      updatePlayerTime();
    }
  }
}

elements.audioFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  event.target.value = "";
  if (file) {
    elements.inputSource.value = "file";
    setInputMode("file");
    loadAudioFile(file).catch((error) => {
      setState("Load error");
      logEvent(error.message);
    });
  }
});

elements.playButton.addEventListener("click", () => {
  toggleTransport().catch((error) => {
    const micDenied = inputMode === "mic_device" && /permission|denied|notallowed/i.test(error.message);
    setState(micDenied ? "Mic denied" : "Play error");
    if (inputMode === "mic_device") {
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
    }
    logEvent(micDenied ? "microphone permission denied" : error.message);
  });
});

elements.stopButton.addEventListener("click", () => {
  if (inputMode === "mic_device") {
    stopDeviceInput();
    blackoutLights();
  } else {
    stopPlayback({ resetPosition: true });
  }
});

elements.inputSource.addEventListener("change", () => {
  setInputMode(elements.inputSource.value);
});

elements.audioDevice.addEventListener("change", () => {
  if (inputMode === "mic_device" && isPlaying) {
    startDeviceInput().catch((error) => {
      const micDenied = /permission|denied|notallowed/i.test(error.message);
      setState(micDenied ? "Mic denied" : "Mic error");
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      logEvent(micDenied ? "microphone permission denied" : error.message);
    });
  }
});

elements.seekSlider.addEventListener("input", () => {
  seekToSliderValue(elements.seekSlider.value).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

elements.trackOverview.addEventListener("click", (event) => {
  if (!hasLoadedAudio() || inputMode !== "file") return;
  const rect = elements.trackOverview.getBoundingClientRect();
  const progress = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  seekToSliderValue(progress * 1000).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

window.addEventListener("resize", () => {
  overviewCacheCanvas = null;
  drawTrackOverview();
  updatePlayerTime();
});

elements.outputTarget.addEventListener("change", () => {
  const selected = elements.outputTarget.options[elements.outputTarget.selectedIndex].text;
  elements.outputLabel.textContent = selected;
  logEvent(`output ${selected}`);
});

elements.genreProfile.addEventListener("change", () => {
  logEvent(`genre ${elements.genreProfile.value}`);
});

elements.lightCount.addEventListener("change", () => {
  buildLights(Number(elements.lightCount.value), false);
  logEvent(`lights ${elements.lightCount.value}`);
});

elements.differentiation.addEventListener("input", () => {
  elements.differentiationValue.textContent = elements.differentiation.value;
});

elements.resetLayoutButton.addEventListener("click", () => {
  buildLights(Number(elements.lightCount.value), false);
  logEvent("layout reset");
});

function startDrag(event) {
  const light = event.currentTarget;
  const index = Number(light.dataset.index);
  light.setPointerCapture(event.pointerId);
  light.classList.add("dragging");
  dragging = { light, index };
  moveDraggedLight(event);
  light.addEventListener("pointermove", moveDraggedLight);
  light.addEventListener("pointerup", stopDrag);
  light.addEventListener("pointercancel", stopDrag);
}

function moveDraggedLight(event) {
  if (!dragging) return;
  const rect = elements.stage.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 6, 94);
  positions[dragging.index] = { x, y };
  dragging.light.style.left = `${x}%`;
  dragging.light.style.top = `${y}%`;
}

function stopDrag(event) {
  const light = event.currentTarget;
  light.classList.remove("dragging");
  light.releasePointerCapture(event.pointerId);
  light.removeEventListener("pointermove", moveDraggedLight);
  light.removeEventListener("pointerup", stopDrag);
  light.removeEventListener("pointercancel", stopDrag);
  dragging = null;
}

buildLights(Number(elements.lightCount.value), false);
setInputMode(elements.inputSource.value);
drawTrackOverview();
