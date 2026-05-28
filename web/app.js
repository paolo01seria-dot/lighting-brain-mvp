const colors = [
  { name: "red", value: [255, 76, 91] },
  { name: "amber", value: [255, 196, 87] },
  { name: "green", value: [88, 221, 130] },
  { name: "blue", value: [88, 123, 255] },
  { name: "white", value: [245, 247, 248] },
];

const genreProfiles = {
  house: { smoothing: 0.62, pulse: 1.08, palette: [1, 2, 3, 4], motion: "bounce", chase: 1.0, threshold: 0.12, decay: 0.82, spread: 2 },
  techno: { smoothing: 0.7, pulse: 1.24, palette: [3, 4, 0], motion: "scan", chase: 1.4, threshold: 0.1, decay: 0.86, spread: 2 },
  metal: { smoothing: 0.42, pulse: 1.52, palette: [0, 4, 3], motion: "hits", chase: 1.95, threshold: 0.08, decay: 0.74, spread: 3 },
  electronic: { smoothing: 0.58, pulse: 1.2, palette: [2, 3, 4, 0], motion: "spiral", chase: 1.25, threshold: 0.11, decay: 0.8, spread: 2 },
  garage: { smoothing: 0.52, pulse: 1.14, palette: [1, 2, 0, 4], motion: "stagger", chase: 1.15, threshold: 0.1, decay: 0.78, spread: 2 },
};

const elements = {
  audioFile: document.querySelector("#audioFile"),
  trackLabel: document.querySelector("#trackLabel"),
  outputTarget: document.querySelector("#outputTarget"),
  outputLabel: document.querySelector("#outputLabel"),
  genreProfile: document.querySelector("#genreProfile"),
  playButton: document.querySelector("#playButton"),
  stopButton: document.querySelector("#stopButton"),
  stateLabel: document.querySelector("#stateLabel"),
  energyLabel: document.querySelector("#energyLabel"),
  energyFill: document.querySelector("#energyFill"),
  eventLog: document.querySelector("#eventLog"),
  lightCount: document.querySelector("#lightCount"),
  differentiation: document.querySelector("#differentiation"),
  differentiationValue: document.querySelector("#differentiationValue"),
  resetLayoutButton: document.querySelector("#resetLayoutButton"),
  stage: document.querySelector("#stage"),
};

let audioContext;
let analyser;
let sourceNode;
let audioBuffer;
let startedAt = 0;
let pausedAt = 0;
let animationFrame;
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
    analyser.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

async function loadAudioFile(file) {
  await ensureAudioContext();
  stopPlayback();
  const data = await file.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(data);
  pausedAt = 0;
  elements.trackLabel.textContent = file.name;
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  setState("Ready");
  logEvent(`loaded ${file.name}`);
}

function createSource() {
  if (!audioBuffer) return null;
  const node = audioContext.createBufferSource();
  node.buffer = audioBuffer;
  node.connect(analyser);
  node.onended = () => {
    if (sourceNode === node) {
      stopPlayback();
    }
  };
  return node;
}

async function playAudio() {
  if (!audioBuffer) return;
  await ensureAudioContext();
  sourceNode = createSource();
  startedAt = audioContext.currentTime - pausedAt;
  sourceNode.start(0, pausedAt);
  setState("Playing");
  elements.playButton.disabled = true;
  animate();
}

function stopPlayback() {
  if (sourceNode) {
    try {
      sourceNode.onended = null;
      sourceNode.stop();
    } catch (_error) {
      // Source may already be stopped.
    }
  }
  sourceNode = null;
  pausedAt = 0;
  cancelAnimationFrame(animationFrame);
  smoothedEnergy = 0;
  previousEnergy = 0;
  previousLow = 0;
  previousMid = 0;
  previousHigh = 0;
  previousRms = 0;
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
  setState(audioBuffer ? "Ready" : "Idle");
  elements.playButton.disabled = !audioBuffer;
  blackoutLights();
  updateMeter(0);
}

function animate() {
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeData = new Uint8Array(analyser.fftSize);
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);
  const profile = genreProfiles[elements.genreProfile.value];
  analyser.smoothingTimeConstant = profile.smoothing;

  const rawEnergy = average(frequencyData) / 255;
  const rms = getRms(timeData);
  smoothedEnergy = smoothedEnergy * 0.58 + rawEnergy * 0.42;
  const energy = Math.min(1, smoothedEnergy * profile.pulse);
  updateLights(frequencyData, energy, rms, profile);
  updateMeter(energy);
  maybeLogSignal(energy);

  animationFrame = requestAnimationFrame(animate);
}

function updateLights(frequencyData, energy, rms, profile) {
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
  const lowOnset = Math.max(0, lowDelta * 1.15 + rmsDelta * 1.35);
  const tonalOnset = Math.max(0, midDelta * 1.35 + highDelta * 1.05 + energyDelta * 0.7);
  const onsetStrength = Math.max(0, energyDelta * 1.05 + lowOnset + tonalOnset + high * 0.04);
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
  const isStrongHit = onsetStrength > profile.threshold * 2.1 || rmsDelta > 0.085;

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
    .filter((item) => item.strength > 0.075 && item.minEnergy > 0.12)
    .sort((a, b) => b.strength - a.strength)[0];

  if (!candidate) {
    musicalClock.confidence *= 0.992;
    return;
  }

  if (musicalClock.lastPulseTime === null) {
    musicalClock.lastPulseTime = reading.time;
    musicalClock.source = candidate.source;
    musicalClock.confidence = Math.max(musicalClock.confidence, 0.18);
    return;
  }

  const interval = reading.time - musicalClock.lastPulseTime;
  if (interval < 0.24) return;
  if (interval > 1.25) {
    musicalClock.lastPulseTime = reading.time;
    musicalClock.confidence *= 0.72;
    return;
  }

  const previousInterval = musicalClock.interval ?? interval;
  const stable = Math.abs(interval - previousInterval) < 0.16;
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
  if (!musicalClock.interval || musicalClock.confidence < 0.34) return false;
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
  if (!sourceNode) return false;
  if (energy < 0.38) return false;
  const framesPerStep = Math.max(18, Math.round(52 / profile.chase));
  return frameCounter % framesPerStep === 0 && time > 0.25;
}

function triggerPattern(context) {
  const count = lights.length;
  if (!count) return;

  const activeIndexes = pickActiveLights(context.profile, context.time, count, context.strong, context.sparse);
  activeIndexes.forEach((index, order) => {
    const colorIndex = pickColorIndex(context, index, order);
    const clockBoost = context.clockSource && context.clockSource !== "none" ? 0.08 : 0;
    const base = context.strong ? 1 : context.sparse ? 0.42 : 0.72 + clockBoost;
    const spectral = context.low * 0.2 + context.mid * 0.14 + context.high * 0.18;
    lightStates[index].intensity = clamp(base + spectral - order * 0.06, 0.28, 1);
    lightStates[index].age = 0;
    lightStates[index].colorIndex = colorIndex;
  });

  if (context.strong && context.profile.motion === "hits") {
    blackoutNonActive(activeIndexes, 0.04);
  }
}

function pickActiveLights(profile, time, count, strong, sparse = false) {
  const step = Math.floor(time * 3.6 * profile.chase);
  const spread = sparse ? 1 : strong ? Math.min(count, profile.spread + 1) : Math.min(count, profile.spread);

  if (profile.motion === "hits") {
    if (strong) {
      return uniqueIndexes([step, step + 2, step + Math.floor(count / 2)], count);
    }
    return uniqueIndexes([step], count);
  }

  if (profile.motion === "scan") {
    return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset), count);
  }

  if (profile.motion === "stagger") {
    return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset * 2), count);
  }

  if (profile.motion === "spiral") {
    return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset * 3), count);
  }

  return uniqueIndexes(Array.from({ length: spread }, (_, offset) => step + offset), count);
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
  const { profile, time, dominantBand, energy, high } = context;
  const phrase = Math.floor(time / 8);
  if (high > 0.62 && order === 0) {
    return 4;
  }
  if (dominantBand >= 0 && dominantBand < colors.length && energy > 0.52) {
    return dominantBand;
  }
  const chaseStep = Math.floor(time * profile.chase + index + phrase + order);
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
      ? `rgba(${r}, ${g}, ${b}, ${0.22 + intensity * 0.78})`
      : "";
    light.style.opacity = visible ? (0.1 + intensity * 0.9).toFixed(3) : "0.62";
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
  if (currentSecond % 4 !== 0) return;
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
  if (!currentSceneByCategory[category]) {
    currentSceneByCategory[category] = 0;
    return true;
  }
  if ((categoryCounters[category] - 1) % threshold === 0) {
    currentSceneByCategory[category] += 1;
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

elements.audioFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    loadAudioFile(file).catch((error) => {
      setState("Load error");
      logEvent(error.message);
    });
  }
});

elements.playButton.addEventListener("click", () => {
  playAudio().catch((error) => {
    setState("Play error");
    logEvent(error.message);
  });
});

elements.stopButton.addEventListener("click", stopPlayback);

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
