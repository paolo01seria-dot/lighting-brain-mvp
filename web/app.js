const colors = [
  { name: "red", value: [255, 76, 91] },
  { name: "amber", value: [255, 196, 87] },
  { name: "green", value: [88, 221, 130] },
  { name: "blue", value: [88, 123, 255] },
  { name: "white", value: [245, 247, 248] },
];

const trainingColors = [
  { name: "red", value: [255, 76, 91] },
  { name: "green", value: [88, 221, 130] },
  { name: "blue", value: [88, 123, 255] },
  { name: "yellow", value: [255, 220, 88] },
  { name: "purple", value: [174, 96, 255] },
  { name: "casual", value: null },
  { name: "blackout", value: [0, 0, 0], blackout: true },
];

const positionNaming = {
  totalFixtureSlots: 32,
  centreDeadbandPercent: 4,
  sideInnerPercent: 25,
};

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
  timelineFile: document.querySelector("#timelineFile"),
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
  trainingMode: document.querySelector("#trainingMode"),
  sampleTagInput: document.querySelector("#sampleTagInput"),
  currentSampleCategory: document.querySelector("#currentSampleCategory"),
  currentSceneCategory: document.querySelector("#currentSceneCategory"),
  currentIntent: document.querySelector("#currentIntent"),
  currentGesture: document.querySelector("#currentGesture"),
  currentEnergyTrend: document.querySelector("#currentEnergyTrend"),
  saveAnnotationButton: document.querySelector("#saveAnnotationButton"),
  downloadAnnotationsButton: document.querySelector("#downloadAnnotationsButton"),
  clearTrainingLightsButton: document.querySelector("#clearTrainingLightsButton"),
  trainingSummary: document.querySelector("#trainingSummary"),
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
let liveEventSource;
let audioBuffer;
let loadedFileName = "";
let loadedTimelineName = "";
let timelineEvents = [];
let timelineRhythmEvents = [];
let timelineDuration = 0;
let timelineCurrentEvent = null;
let timelineCurrentRhythmEvent = null;
let timelinePausedAt = 0;
let timelineStartedAt = 0;
let timelineNextIndex = 0;
let timelineNextRhythmIndex = 0;
let startedAt = 0;
let pausedAt = 0;
let animationFrame;
let timelineAnimationFrame;
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
let lastEnergyDropTime = -999;
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
let trainingAnnotations = [];

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
    const light = document.createElement("div");
    light.setAttribute("role", "button");
    light.tabIndex = 0;
    light.className = "light";
    light.dataset.index = String(index);
    light.title = positionName(index);
    light.style.left = `${position.x}%`;
    light.style.top = `${position.y}%`;
    const label = document.createElement("span");
    label.className = "light-label";
    label.textContent = positionName(index);
    light.appendChild(label);
    ["first", "second"].forEach((phase) => {
      const phaseButton = document.createElement("button");
      phaseButton.type = "button";
      phaseButton.className = `phase-button phase-button-${phase}`;
      phaseButton.dataset.phase = phase;
      phaseButton.title = phase === "first" ? "Prima meta BPM" : "Seconda meta BPM";
      phaseButton.addEventListener("pointerdown", stopPhaseButtonEvent);
      phaseButton.addEventListener("click", toggleTrainingLightPhase);
      phaseButton.addEventListener("contextmenu", stopPhaseButtonEvent);
      light.appendChild(phaseButton);
    });
    light.addEventListener("pointerdown", startDrag);
    light.addEventListener("contextmenu", cycleTrainingLightBackward);
    elements.stage.appendChild(light);
    lights.push(light);
    lightStates.push({
      intensity: 0,
      age: 999,
      colorIndex: index % colors.length,
      manualColorIndex: null,
      manualRandomColor: null,
      phaseFirstHalf: true,
      phaseSecondHalf: true,
    });
  });

  renderLights();
}

function refreshLightPositionLabels() {
  lights.forEach((light, index) => {
    const label = light.querySelector(".light-label");
    const name = positionName(index);
    light.title = name;
    if (label) label.textContent = name;
  });
}

function positionName(index) {
  const info = positionInfo(index);
  if (info.side === "centre") {
    return `${info.zone}-${info.position}`;
  }
  return `${info.zone}-${info.side}-${info.position}`;
}

function positionInfo(index) {
  const position = positions[index] ?? { x: 50, y: 50 };
  const zone = positionZone(position);
  const side = positionSide(index, position, zone);
  const slotsPerQuarter = Math.max(1, Math.ceil(positionNaming.totalFixtureSlots / 4));
  const outer =
    side === "L"
      ? position.x <= positionNaming.sideInnerPercent
      : side === "R"
        ? position.x >= 100 - positionNaming.sideInnerPercent
        : false;
  const sameZoneSide = positions
    .map((candidate, candidateIndex) => ({ ...candidate, index: candidateIndex }))
    .filter((candidate) => {
      const candidateZone = positionZone(candidate);
      const candidateSide = positionSide(candidate.index, candidate, candidateZone);
      const candidateOuter =
        candidateSide === "L"
          ? candidate.x <= positionNaming.sideInnerPercent
          : candidateSide === "R"
            ? candidate.x >= 100 - positionNaming.sideInnerPercent
            : false;
      return candidateZone === zone && candidateSide === side && candidateOuter === outer;
    })
    .sort((left, right) => {
      if (side === "centre") return left.y - right.y;
      if (!outer) return Math.abs(left.x - 50) - Math.abs(right.x - 50);
      return side === "L" ? left.x - right.x : right.x - left.x;
    });
  const rank = clamp(
    Math.max(1, sameZoneSide.findIndex((candidate) => candidate.index === index) + 1),
    1,
    slotsPerQuarter
  );
  const centrePosition = side === "centre" ? centrePositionInfo(index, zone) : null;
  const macroGroup = side === "centre"
    ? `${zone}-centre-all`
    : `${zone}-${side}-${outer ? "all-to-last" : "all"}`;
  return {
    zone,
    side,
    rank,
    position: centrePosition?.label ?? (outer ? fromLastLabel(rank) : String(rank)),
    centre_offset: centrePosition?.offset ?? null,
    outer,
    macro_group: macroGroup,
    slots_per_quarter: slotsPerQuarter,
  };
}

function positionZone(position) {
  return position.y < 33 ? "up" : position.y < 66 ? "middle" : "down";
}

function positionSide(index, position, zone) {
  if (Math.abs(position.x - 50) >= positionNaming.centreDeadbandPercent) {
    return position.x < 50 ? "L" : "R";
  }

  return "centre";
}

function centrePositionInfo(index, zone) {
  const centreCandidates = positions
    .map((candidate, candidateIndex) => ({ ...candidate, index: candidateIndex }))
    .filter((candidate) => {
      return positionZone(candidate) === zone && Math.abs(candidate.x - 50) < positionNaming.centreDeadbandPercent;
    })
    .sort((left, right) => {
      if (left.y !== right.y) return left.y - right.y;
      return left.index - right.index;
    });

  const order = centreCandidates.findIndex((candidate) => candidate.index === index);
  const centreOrder = Math.floor((centreCandidates.length - 1) / 2);
  const offset = centreOrder - order;
  if (offset === 0) {
    return { label: "centre", offset };
  }
  return { label: `centre${offset > 0 ? "+" : ""}${offset}`, offset };
}

function fromLastLabel(rank) {
  if (rank <= 1) return "last";
  return `${rank}-to-last`;
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
  stopTimelinePlayback({ resetPosition: true, keepLights: true });
  stopPlayback({ resetPosition: true });
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrl = URL.createObjectURL(file);
  ensureAudioElement();
  audioElement.src = objectUrl;
  audioElement.load();

  loadedFileName = file.name;
  audioBuffer = null;
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

  file.arrayBuffer().then((data) => {
    return audioContext.decodeAudioData(data);
  }).then((decodedBuffer) => {
    audioBuffer = decodedBuffer;
    overviewCacheCanvas = null;
    drawTrackOverview();
    updatePlayerTime();
  }).catch(() => {
    audioBuffer = null;
    drawTrackOverview();
    logEvent("overview unavailable");
  });
}

async function loadTimelineFile(file) {
  stopDeviceInput();
  stopPlayback({ resetPosition: true, keepLights: true });
  stopTimelinePlayback({ resetPosition: true, keepLights: true });

  const text = await file.text();
  const parsed = JSON.parse(text);
  const timeline = parsed.timeline ?? parsed;
  const events = Array.isArray(timeline.events) ? timeline.events : [];
  if (!events.length) {
    throw new Error("Timeline JSON senza eventi");
  }

  timelineEvents = events
    .map((event) => ({
      ...event,
      time: Number(event.time ?? event.at ?? 0),
    }))
    .filter((event) => Number.isFinite(event.time))
    .sort((left, right) => left.time - right.time);
  timelineRhythmEvents = (Array.isArray(timeline.rhythm_events) ? timeline.rhythm_events : [])
    .map((event) => ({
      ...event,
      time: Number(event.time ?? 0),
    }))
    .filter((event) => Number.isFinite(event.time))
    .sort((left, right) => left.time - right.time);

  const lastEventTime = timelineEvents[timelineEvents.length - 1]?.time ?? 0;
  const lastRhythmTime = timelineRhythmEvents[timelineRhythmEvents.length - 1]?.time ?? 0;
  timelineDuration = Math.max(Number(timeline.duration ?? 0), lastEventTime + 8, lastRhythmTime + 2);
  loadedTimelineName = file.name;
  timelinePausedAt = 0;
  timelineNextIndex = 0;
  timelineNextRhythmIndex = 0;
  timelineCurrentEvent = timelineEvents[0] ?? null;
  timelineCurrentRhythmEvent = null;
  inputMode = "timeline";
  document.body.classList.remove("is-mic-mode");
  elements.inputSource.value = "timeline";
  elements.trackLabel.textContent = loadedTimelineName;
  elements.playButton.textContent = "Play";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.seekSlider.disabled = false;
  setState("Timeline ready");
  updateMeter(0);
  drawTimelineOverview();
  updatePlayerTime();
  logEvent(`timeline loaded ${file.name}`);
  if (!timelineRhythmEvents.length) {
    logEvent("no rhythm_events: rigenera il JSON con Python");
  }
}

function ensureAudioElement() {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = "auto";
    audioElement.addEventListener("ended", () => {
      stopPlayback({ resetPosition: true });
    });
    audioElement.addEventListener("loadedmetadata", updatePlayerTime);
    audioElement.addEventListener("durationchange", updatePlayerTime);
    audioElement.addEventListener("canplay", () => {
      if (inputMode === "file" && hasLoadedAudio()) {
        elements.playButton.disabled = false;
        elements.stopButton.disabled = false;
      }
    });
  }
  if (!mediaElementSource) {
    mediaElementSource = audioContext.createMediaElementSource(audioElement);
    mediaElementSource.connect(analyser);
    mediaElementSource.connect(audioContext.destination);
  }
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
  if (isTrainingMode()) {
    blackoutAutoLights();
  }
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
  lastEnergyDropTime = -999;
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

async function playTimeline() {
  if (!timelineEvents.length) return;
  await ensureAudioContext();
  cancelAnimationFrame(timelineAnimationFrame);
  if (timelinePausedAt >= timelineDuration) {
    timelinePausedAt = 0;
  }
  timelineStartedAt = audioContext.currentTime - timelinePausedAt;
  timelineNextIndex = findNextTimelineIndex(timelinePausedAt);
  timelineNextRhythmIndex = findNextTimelineRhythmIndex(timelinePausedAt);
  timelineCurrentEvent = findTimelineEventAt(timelinePausedAt);
  timelineCurrentRhythmEvent = findTimelineRhythmEventAt(timelinePausedAt);
  isPlaying = true;
  setState("Timeline playing");
  elements.playButton.textContent = "Pause";
  elements.stopButton.disabled = false;
  animateTimeline();
}

function pauseTimeline() {
  if (!audioContext) return;
  timelinePausedAt = clamp(audioContext.currentTime - timelineStartedAt, 0, timelineDuration);
  isPlaying = false;
  cancelAnimationFrame(timelineAnimationFrame);
  setState("Timeline paused");
  elements.playButton.textContent = "Play";
  if (isTrainingMode()) {
    blackoutAutoLights();
  }
  updatePlayerTime();
}

function stopTimelinePlayback(options = {}) {
  const { resetPosition = true, keepLights = false } = options;
  cancelAnimationFrame(timelineAnimationFrame);
  if (inputMode === "timeline") {
    isPlaying = false;
    if (resetPosition) {
      timelinePausedAt = 0;
      timelineNextIndex = 0;
      timelineNextRhythmIndex = 0;
      timelineCurrentEvent = timelineEvents[0] ?? null;
      timelineCurrentRhythmEvent = null;
    }
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !timelineEvents.length;
    elements.stopButton.disabled = !timelineEvents.length;
    setState(timelineEvents.length ? "Timeline ready" : "Idle");
    updateMeter(0);
    if (!keepLights) blackoutLights();
    updatePlayerTime();
  }
}

function animateTimeline() {
  if (!isPlaying || inputMode !== "timeline") return;
  const time = clamp(audioContext.currentTime - timelineStartedAt, 0, timelineDuration);
  const profile = genreProfiles[elements.genreProfile.value];
  decayLightStates(profile.decay);

  while (timelineNextIndex < timelineEvents.length && timelineEvents[timelineNextIndex].time <= time) {
    triggerTimelineEvent(timelineEvents[timelineNextIndex]);
    timelineCurrentEvent = timelineEvents[timelineNextIndex];
    timelineNextIndex += 1;
  }
  while (timelineNextRhythmIndex < timelineRhythmEvents.length && timelineRhythmEvents[timelineNextRhythmIndex].time <= time) {
    triggerTimelineRhythmEvent(timelineRhythmEvents[timelineNextRhythmIndex]);
    timelineCurrentRhythmEvent = timelineRhythmEvents[timelineNextRhythmIndex];
    timelineNextRhythmIndex += 1;
  }

  const energy = getTimelinePreviewEnergy(time);
  updateMeter(energy);
  renderLights();
  updatePlayerTime();

  if (time >= timelineDuration) {
    stopTimelinePlayback({ resetPosition: true });
    return;
  }
  timelineAnimationFrame = requestAnimationFrame(animateTimeline);
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
  if (shouldBlackoutForEnergyDrop(energy, rms, time)) {
    blackoutLights();
    rememberPreviousAudioState({ energy, low, mid, high, rms });
    frameCounter += 1;
    return;
  }
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
  rememberPreviousAudioState({ energy, low, mid, high, rms });
  frameCounter += 1;
}

function shouldBlackoutForEnergyDrop(energy, rms, time) {
  const energyDrop = previousEnergy - energy;
  const rmsDrop = previousRms - rms;
  const absoluteQuiet = energy < 0.045 && rms < 0.035;
  const abruptDrop = previousEnergy > 0.22 && energyDrop > 0.16 && energy < 0.18;
  const abruptRmsDrop = previousRms > 0.12 && rmsDrop > 0.08 && rms < 0.08;
  const cooldownReady = time - lastEnergyDropTime > 0.22;
  if ((absoluteQuiet || abruptDrop || abruptRmsDrop) && cooldownReady) {
    lastEnergyDropTime = time;
    musicalClock.confidence *= 0.38;
    musicalClock.source = "none";
    logEvent(`${formatTime(Math.floor(time))} blackout energy drop`);
    return true;
  }
  return false;
}

function rememberPreviousAudioState(reading) {
  previousEnergy = reading.energy;
  previousLow = reading.low;
  previousMid = reading.mid;
  previousHigh = reading.high;
  previousRms = reading.rms;
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

  const activeIndexes = context.gesture
    ? pickGestureLights(context, count)
    : pickActiveLights(context.profile, context.time, count, context.strong, context.sparse, context.clockSource, context.energy);
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

function pickGestureLights(context, count) {
  if (count <= 1) return [0];
  const step = Math.floor(context.time * 2.1 + sceneVariant);
  if (context.gesture === "accent_flash" || context.gesture === "downbeat_flash") {
    return symmetricalIndexes(step, count, Math.min(count, 4));
  }
  if (context.gesture === "accent_pair" || context.gesture === "symmetrical_pair") {
    return symmetricalIndexes(step, count, Math.min(count, 2));
  }
  if (context.gesture === "buildup_spark") {
    const pairs = buildSymmetryPairs(count);
    return pairs[0] ?? symmetricalIndexes(step, count, Math.min(count, 2));
  }
  if (context.gesture === "drop_step") {
    return symmetricalIndexes(step, count, Math.min(count, 3));
  }
  return musicalSingleOrPair(step, count, context.sparse);
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
  const { profile, time, dominantBand, energy, high, category, colorFamily } = context;
  const differentiation = Number(elements.differentiation.value);
  const categoryOffset = category === "high_energy_drop" ? 2 : category === "steady_bass_pulse" ? 1 : 0;
  const phrase = Math.floor(time / 8);
  if (colorFamily === "white") return 4;
  if (colorFamily === "hot") return order % 2 === 0 ? 0 : 1;
  if (colorFamily === "amber") return 1;
  if (colorFamily === "cool") return order % 2 === 0 ? 3 : 2;
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
    if (!isTrainingMode()) {
      state.manualColorIndex = null;
      state.manualRandomColor = null;
    }
  });
  renderLights();
}

function blackoutAutoLights() {
  lightStates.forEach((state) => {
    if (state.manualColorIndex === null || state.manualColorIndex === undefined) {
      state.intensity = 0;
      state.age = 999;
    }
  });
  renderLights();
}

function randomTrainingColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 78 + Math.floor(Math.random() * 18);
  const lightness = 54 + Math.floor(Math.random() * 14);
  return hslToRgb(hue, saturation, lightness);
}

function hslToRgb(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  const [rp, gp, bp] = hue < 60
    ? [c, x, 0]
    : hue < 120
      ? [x, c, 0]
      : hue < 180
        ? [0, c, x]
        : hue < 240
          ? [0, x, c]
          : hue < 300
            ? [x, 0, c]
            : [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

function manualLightColor(state) {
  if (state.manualColorIndex === null || state.manualColorIndex === undefined) return null;
  const color = trainingColors[state.manualColorIndex];
  if (!color) return null;
  if (color.name === "casual") {
    if (!state.manualRandomColor) {
      state.manualRandomColor = randomTrainingColor();
    }
    return { ...color, value: state.manualRandomColor };
  }
  return color;
}

function renderLights() {
  lights.forEach((light, index) => {
    const state = lightStates[index] ?? { intensity: 0, colorIndex: index % colors.length };
    const manual = state.manualColorIndex !== null && state.manualColorIndex !== undefined;
    const manualColor = manualLightColor(state);
    const color = manualColor ?? colors[state.colorIndex];
    const [r, g, b] = color.value;
    const phaseFirst = state.phaseFirstHalf !== false;
    const phaseSecond = state.phaseSecondHalf !== false;
    const activePhaseCount = (phaseFirst ? 1 : 0) + (phaseSecond ? 1 : 0);
    const manualBlackout = Boolean(manual && (manualColor?.blackout || activePhaseCount === 0));
    const intensity = manual ? (manualBlackout ? 0 : 1) : clamp(state.intensity, 0, 1);
    const visible = intensity > 0.04;
    const phaseSplit = manual && (!phaseFirst || !phaseSecond);
    const phaseColor = `rgba(${r}, ${g}, ${b}, ${0.48 + intensity * 0.42})`;
    const phaseOff = "rgba(0, 0, 0, 0.96)";
    const partialPhase = manual && activePhaseCount === 1;
    const showGlow = visible && !partialPhase && !manualBlackout;
    const leftPhaseButton = light.querySelector('[data-phase="first"]');
    const rightPhaseButton = light.querySelector('[data-phase="second"]');

    light.style.background = visible
      ? phaseSplit
        ? "radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.18) 0 10%, rgba(255, 255, 255, 0.06) 11% 29%, rgba(0, 0, 0, 0.42) 30% 64%, rgba(0, 0, 0, 0.82) 65%), linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(4, 6, 7, 0.9) 48%, rgba(255, 255, 255, 0.07))"
        : `radial-gradient(circle at 50% 44%, rgba(255, 255, 255, ${0.18 + intensity * 0.42}) 0 12%, rgba(${r}, ${g}, ${b}, ${0.34 + intensity * 0.58}) 13% 48%, rgba(${r}, ${g}, ${b}, ${0.12 + intensity * 0.22}) 49% 72%, rgba(0, 0, 0, 0.58) 73%)`
      : "";
    light.style.opacity = visible ? (0.24 + intensity * 0.76).toFixed(3) : "0.82";
    light.style.boxShadow = showGlow
      ? `0 0 ${Math.round(10 + intensity * 54)}px rgba(${r}, ${g}, ${b}, ${intensity * 0.84})`
      : "";
    light.style.setProperty("--beam", showGlow ? `rgba(${r}, ${g}, ${b}, ${intensity})` : "transparent");
    light.style.setProperty("--beam-opacity", showGlow ? String(intensity * 0.42) : "0");
    light.style.setProperty("--phase-left", phaseFirst ? phaseColor : phaseOff);
    light.style.setProperty("--phase-right", phaseSecond ? phaseColor : phaseOff);
    light.classList.toggle("active", intensity > 0.62);
    light.classList.toggle("manual", manual);
    light.classList.toggle("phase-split", phaseSplit);
    light.classList.toggle("blackout", manualBlackout);
    leftPhaseButton?.classList.toggle("is-off", !phaseFirst || manualBlackout);
    rightPhaseButton?.classList.toggle("is-off", !phaseSecond || manualBlackout);
  });
}

function updateMeter(energy) {
  const percent = Math.round(energy * 100);
  elements.energyLabel.textContent = `${percent}%`;
  elements.energyFill.style.width = `${percent}%`;
}

function liveFrameToFrequencyData(frame) {
  const frequencyData = new Uint8Array(64);
  const spectrum = Array.isArray(frame.spectrum) ? frame.spectrum : [];
  if (!spectrum.length) return frequencyData;
  frequencyData.forEach((_value, index) => {
    const sourceIndex = Math.min(spectrum.length - 1, Math.floor((index / frequencyData.length) * spectrum.length));
    frequencyData[index] = Math.round(clamp(spectrum[sourceIndex], 0, 1) * 255);
  });
  return frequencyData;
}

function handleLiveAudioFrame(frame) {
  if (frame.error) {
    setState("Live audio error");
    logEvent(frame.error);
    stopLiveAudio(false);
    return;
  }
  const profile = genreProfiles[elements.genreProfile.value];
  const frequencyData = liveFrameToFrequencyData(frame);
  const energy = clamp(Number(frame.energy ?? 0), 0, 1);
  const rms = energy / 4;
  const time = Number(frame.time ?? 0);
  startedAt = audioContext ? audioContext.currentTime - time : startedAt;
  drawLiveSpectrum(frequencyData);
  if (frame.sample_category === "silence_or_pause" || frame.sample_category === "stop_music_moment" || frame.energy_drop > 0.18) {
    blackoutLights();
    updateMeter(energy);
    updatePlayerTime();
    maybeLogLiveFrame(frame);
    rememberPreviousAudioState({
      energy,
      low: 0,
      mid: 0,
      high: 0,
      rms,
    });
    return;
  }
  updateLights(frequencyData, energy, rms, profile, Number(frame.spectral_flux ?? 0));
  updateMeter(energy);
  updatePlayerTime();
  maybeLogLiveFrame(frame);
  previousSpectrum = new Uint8Array(frequencyData);
}

function maybeLogLiveFrame(frame) {
  const second = Math.floor(Number(frame.time ?? 0));
  if (second === lastEventSecond || second % 2 !== 0) return;
  lastEventSecond = second;
  logEvent(`${formatTime(second)} live ${frame.sample_category ?? "unknown"} energy:${Math.round((frame.energy ?? 0) * 100)}%`);
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

function triggerTimelineEvent(event) {
  const profile = genreProfiles[elements.genreProfile.value];
  const category = event.sample_category ?? event.category ?? categoryFromScene(event.scene);
  const energy = timelineCategoryEnergy(category);
  const clockSource = category === "steady_bass_pulse"
    ? "bass"
    : category === "buildup"
      ? "mid_arpeggio"
      : category === "high_energy_drop"
        ? "high_pattern"
        : "none";

  updateCategoryScene(category);
  triggerPattern({
    profile,
    time: event.time,
    energy,
    low: category === "steady_bass_pulse" ? 0.82 : energy * 0.38,
    mid: category === "buildup" || category === "steady_bass_pulse" ? 0.72 : energy * 0.45,
    high: category === "high_energy_drop" ? 0.86 : energy * 0.34,
    dominantBand: category === "high_energy_drop" ? 4 : category === "buildup" ? 2 : 1,
    strong: category === "high_energy_drop",
    sparse: category === "ambient_no_beat" || category === "breakdown",
    clockSource,
    category,
  });
  logEvent(`${formatTime(Math.floor(event.time))} timeline ${category} ${event.scene ?? "scene"}`);
}

function triggerTimelineRhythmEvent(event) {
  const profile = genreProfiles[elements.genreProfile.value];
  const category = event.sample_category ?? event.category ?? categoryFromScene(event.scene);
  const downbeat = event.pulse === "downbeat";
  const accent = event.pulse === "accent";
  const highEnergy = category === "high_energy_drop";
  const buildup = category === "buildup";
  const steady = category === "steady_bass_pulse";
  const baseEnergy = Number(event.intensity ?? timelineCategoryEnergy(category));
  const beatEnergy = clamp(baseEnergy * (downbeat ? 1.08 : 0.82), 0.2, 1);

  triggerPattern({
    profile,
    time: event.time,
    energy: beatEnergy,
    low: steady || highEnergy ? 0.74 : 0.32,
    mid: buildup || steady ? 0.68 : 0.42,
    high: highEnergy ? 0.78 : downbeat ? 0.48 : 0.28,
    dominantBand: highEnergy ? 4 : buildup ? 2 : 1,
    strong: accent || (highEnergy && downbeat),
    sparse: category === "ambient_no_beat" || category === "breakdown",
    clockSource: steady ? "bass" : buildup ? "mid_arpeggio" : highEnergy ? "high_pattern" : "none",
    category,
    gesture: event.gesture,
    colorFamily: event.color_family,
    symmetry: event.symmetry,
  });
}

function categoryFromScene(scene = "") {
  const normalized = String(scene).toLowerCase();
  if (normalized.includes("drop") || normalized.includes("hook") || normalized.includes("chorus")) return "high_energy_drop";
  if (normalized.includes("buildup") || normalized.includes("lift")) return "buildup";
  if (normalized.includes("pulse") || normalized.includes("chase") || normalized.includes("groove")) return "steady_bass_pulse";
  if (normalized.includes("break")) return "breakdown";
  return "ambient_no_beat";
}

function timelineCategoryEnergy(category) {
  if (category === "high_energy_drop") return 0.92;
  if (category === "buildup") return 0.72;
  if (category === "steady_bass_pulse") return 0.58;
  if (category === "breakdown") return 0.34;
  return 0.24;
}

function getTimelinePreviewEnergy(time) {
  const previousRhythmEvent = findTimelineRhythmEventAt(time);
  if (previousRhythmEvent) {
    const age = Math.max(0, time - previousRhythmEvent.time);
    const base = Number(previousRhythmEvent.intensity ?? timelineCategoryEnergy(previousRhythmEvent.sample_category));
    return clamp(base * Math.exp(-age * 3.6), 0, 1);
  }
  const previousEvent = findTimelineEventAt(time);
  return previousEvent
    ? timelineCategoryEnergy(previousEvent.sample_category ?? previousEvent.category ?? categoryFromScene(previousEvent.scene)) * 0.25
    : 0;
}

function findTimelineEventAt(time) {
  let current = timelineEvents[0] ?? null;
  for (const event of timelineEvents) {
    if (event.time > time) break;
    current = event;
  }
  return current;
}

function findTimelineRhythmEventAt(time) {
  let current = null;
  for (const event of timelineRhythmEvents) {
    if (event.time > time) break;
    current = event;
  }
  return current;
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
  if (inputMode === "timeline") {
    return isPlaying && audioContext
      ? clamp(audioContext.currentTime - timelineStartedAt, 0, timelineDuration)
      : clamp(timelinePausedAt, 0, timelineDuration);
  }
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
  updateTrainingReadout(current);
  if (inputMode === "timeline") {
    elements.seekSlider.disabled = !timelineEvents.length;
    elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
    return;
  }
  if (!hasLoadedAudio() || inputMode !== "file") {
    elements.seekSlider.value = "0";
    elements.seekSlider.disabled = true;
    return;
  }
  elements.seekSlider.disabled = false;
  elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
}

function updateTrainingReadout(time) {
  const sceneEvent = inputMode === "timeline" ? findTimelineEventAt(time) : null;
  const rhythmEvent = inputMode === "timeline" ? findTimelineRhythmEventAt(time) : null;
  const metadata = sceneEvent?.metadata ?? {};
  elements.currentSampleCategory.textContent = sceneEvent?.sample_category ?? rhythmEvent?.sample_category ?? "-";
  elements.currentSceneCategory.textContent = metadata.lighting?.scene_category ?? sceneEvent?.scene ?? "-";
  elements.currentIntent.textContent = metadata.designer_logic?.lighting_intent ?? sceneEvent?.intent ?? "-";
  elements.currentGesture.textContent = rhythmEvent?.gesture ?? "-";
  elements.currentEnergyTrend.textContent = metadata.audio?.energy_trend ?? "-";
}

function hasLoadedAudio() {
  return Boolean(audioElement?.src);
}

function getAudioDuration() {
  if (inputMode === "timeline") {
    return timelineDuration;
  }
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

function drawTimelineOverview() {
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#0d1011";
  context.fillRect(0, 0, width, height);
  drawOverviewGrid(context, width, height);

  timelineEvents.forEach((event) => {
    const category = event.sample_category ?? event.category ?? categoryFromScene(event.scene);
    const energy = timelineCategoryEnergy(category);
    const x = Math.round((event.time / Math.max(timelineDuration, 0.001)) * width);
    const markerHeight = Math.max(12, energy * height * 0.84);
    const [r, g, b] = colors[colorIndexForTimelineCategory(category)].value;
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.28 + energy * 0.62})`;
    context.fillRect(Math.max(0, x - 2 * ratio), height - markerHeight, Math.max(2, 4 * ratio), markerHeight);
  });
}

function colorIndexForTimelineCategory(category) {
  if (category === "high_energy_drop") return 4;
  if (category === "buildup") return 1;
  if (category === "steady_bass_pulse") return 3;
  if (category === "breakdown") return 2;
  return 0;
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
  if (inputMode === "timeline") {
    drawTimelineOverview();
    const canvas = elements.trackOverview;
    const context = canvas.getContext("2d");
    const progress = clamp(current / Math.max(duration, 0.001), 0, 1);
    const x = Math.round(progress * canvas.width);
    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.lineWidth = Math.max(1, window.devicePixelRatio || 1);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
    return;
  }
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
  if (inputMode === "timeline") {
    const wasPlaying = isPlaying;
    timelinePausedAt = (Number(value) / 1000) * timelineDuration;
    timelineNextIndex = findNextTimelineIndex(timelinePausedAt);
    timelineNextRhythmIndex = findNextTimelineRhythmIndex(timelinePausedAt);
    timelineCurrentEvent = findTimelineEventAt(timelinePausedAt);
    timelineCurrentRhythmEvent = findTimelineRhythmEventAt(timelinePausedAt);
    if (wasPlaying) {
      await playTimeline();
    } else {
      updatePlayerTime();
    }
    return;
  }
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

function findNextTimelineIndex(time) {
  const index = timelineEvents.findIndex((event) => event.time >= time);
  return index === -1 ? timelineEvents.length : index;
}

function findNextTimelineRhythmIndex(time) {
  const index = timelineRhythmEvents.findIndex((event) => event.time >= time);
  return index === -1 ? timelineRhythmEvents.length : index;
}

function isTrainingMode() {
  return Boolean(elements.trainingMode?.checked);
}

function cycleTrainingLight(index, direction = 1) {
  if (!isTrainingMode()) return;
  const state = lightStates[index];
  if (!state) return;
  const currentIndex = state.manualColorIndex === null || state.manualColorIndex === undefined
    ? (direction > 0 ? -1 : 0)
    : state.manualColorIndex;
  const nextIndex = (currentIndex + direction + trainingColors.length) % trainingColors.length;
  state.manualColorIndex = nextIndex;
  state.manualRandomColor = trainingColors[nextIndex].name === "casual" ? randomTrainingColor() : null;
  state.intensity = trainingColors[nextIndex].blackout ? 0 : 1;
  if (state.phaseFirstHalf === false && state.phaseSecondHalf === false && !trainingColors[nextIndex].blackout) {
    state.phaseFirstHalf = true;
    state.phaseSecondHalf = true;
  }
  renderLights();
}

function cycleTrainingLightBackward(event) {
  if (!isTrainingMode()) return;
  if (event.target.closest(".phase-button")) return;
  event.preventDefault();
  const index = Number(event.currentTarget.dataset.index);
  cycleTrainingLight(index, -1);
}

function stopPhaseButtonEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function toggleTrainingLightPhase(event) {
  if (!isTrainingMode()) return;
  event.preventDefault();
  event.stopPropagation();
  const phaseButton = event.currentTarget;
  const light = phaseButton.closest(".light");
  const index = Number(light.dataset.index);
  const state = lightStates[index];
  if (!state) return;
  if (state.manualColorIndex === null || state.manualColorIndex === undefined) {
    state.manualColorIndex = 0;
    state.intensity = 1;
  }
  if (trainingColors[state.manualColorIndex]?.blackout) {
    state.manualColorIndex = 0;
    state.intensity = 1;
  }
  if (phaseButton.dataset.phase === "first") {
    state.phaseFirstHalf = !state.phaseFirstHalf;
  } else {
    state.phaseSecondHalf = !state.phaseSecondHalf;
  }
  state.intensity = state.phaseFirstHalf || state.phaseSecondHalf ? 1 : 0;
  renderLights();
}

function clearTrainingLights() {
  lightStates.forEach((state) => {
    state.manualColorIndex = null;
    state.manualRandomColor = null;
    state.intensity = 0;
    state.age = 999;
    state.phaseFirstHalf = true;
    state.phaseSecondHalf = true;
  });
  renderLights();
}

function saveTrainingAnnotation() {
  const time = currentPlaybackTime();
  const sceneEvent = inputMode === "timeline" ? findTimelineEventAt(time) : null;
  const rhythmEvent = inputMode === "timeline" ? findTimelineRhythmEventAt(time) : null;
  const annotation = {
    id: `mark_${String(trainingAnnotations.length + 1).padStart(3, "0")}`,
    time: roundNumber(time, 4),
    input_mode: inputMode,
    track: loadedTimelineName || loadedFileName || null,
    sound_sample: normalizeSampleTag(elements.sampleTagInput.value),
    brain: {
      scene: sceneEvent?.scene ?? null,
      sample_category: sceneEvent?.sample_category ?? rhythmEvent?.sample_category ?? null,
      intent: sceneEvent?.intent ?? null,
      rhythm_gesture: rhythmEvent?.gesture ?? null,
      metadata: sceneEvent?.metadata ?? null,
    },
    desired_lights: lightStates.map((state, index) => {
      const info = positionInfo(index);
      const color = manualLightColor(state);
      const isBlackout = Boolean(color?.blackout || (state.phaseFirstHalf === false && state.phaseSecondHalf === false));
      return {
        index,
        position_name: positionName(index),
        zone: info.zone,
        side: info.side,
        rank: info.rank,
        position: info.position,
        centre_offset: info.centre_offset,
        outer: info.outer,
        macro_group: info.macro_group,
        slots_per_quarter: info.slots_per_quarter,
        x: roundNumber(positions[index]?.x ?? 0, 2),
        y: roundNumber(positions[index]?.y ?? 0, 2),
        color: color?.name ?? "off",
        rgb: color?.value ?? [0, 0, 0],
        intensity: color && !isBlackout ? 1 : 0,
        phase: {
          first_half_on: state.phaseFirstHalf !== false,
          second_half_on: state.phaseSecondHalf !== false,
        },
      };
    }),
  };
  trainingAnnotations.push(annotation);
  updateTrainingSummary();
  logEvent(`saved ${annotation.id} ${formatTime(Math.floor(time))}`);
}

function normalizeSampleTag(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || null;
}

function updateTrainingSummary() {
  elements.trainingSummary.textContent = `${trainingAnnotations.length} marks`;
}

function downloadTrainingAnnotations() {
  const payload = {
    version: 1,
    created_at: new Date().toISOString(),
    track: loadedTimelineName || loadedFileName || null,
    annotations: trainingAnnotations,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lighting-training-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function roundNumber(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function toggleTransport() {
  if (inputMode === "timeline") {
    if (isPlaying) {
      pauseTimeline();
    } else {
      await playTimeline();
    }
    return;
  }
  if (inputMode === "mic_device") {
    if (isPlaying) {
      stopDeviceInput();
    } else {
      await startDeviceInput();
    }
    return;
  }
  if (inputMode === "system_audio") {
    if (isPlaying) {
      stopLiveAudio();
    } else {
      await startLiveAudio();
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
  if (inputMode === "timeline" && mode !== "timeline") {
    stopTimelinePlayback({ resetPosition: false, keepLights: true });
  }
  if (inputMode === "system_audio" && mode !== "system_audio") {
    stopLiveAudio(false);
  }
  inputMode = mode;
  const fileMode = mode === "file";
  const timelineMode = mode === "timeline";
  const liveMode = mode === "system_audio";
  document.body.classList.toggle("is-mic-mode", mode === "mic_device" || liveMode);
  document.body.classList.toggle("mode-file", fileMode);
  document.body.classList.toggle("mode-timeline", timelineMode);
  document.body.classList.toggle("mode-mic_device", mode === "mic_device");
  document.body.classList.toggle("mode-system_audio", liveMode);
  elements.audioFile.disabled = !fileMode;
  elements.audioFile.closest(".file-control").classList.toggle("disabled", !fileMode);
  elements.audioDevice.disabled = mode !== "mic_device" && !liveMode;
  if (fileMode) {
    stopDeviceInput();
    setState(hasLoadedAudio() ? "Ready" : "Idle");
    elements.trackLabel.textContent = loadedFileName || "No track loaded";
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !hasLoadedAudio();
    elements.stopButton.disabled = !hasLoadedAudio();
  } else if (timelineMode) {
    stopDeviceInput();
    stopLiveAudio(false);
    stopPlayback({ resetPosition: false, keepLights: true });
    setState(timelineEvents.length ? "Timeline ready" : "Load timeline");
    elements.trackLabel.textContent = loadedTimelineName || "No timeline loaded";
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !timelineEvents.length;
    elements.stopButton.disabled = !timelineEvents.length;
    if (timelineEvents.length) {
      drawTimelineOverview();
    }
  } else if (mode === "mic_device") {
    stopPlayback({ resetPosition: false, keepLights: true });
    setState("Mic ready");
    elements.trackLabel.textContent = "Mic Device";
    elements.playButton.textContent = "Listen";
    elements.playButton.disabled = false;
    elements.stopButton.disabled = true;
    refreshAudioDevices();
  } else {
    stopDeviceInput();
    stopPlayback({ resetPosition: false, keepLights: true });
    setState("Live audio ready");
    elements.trackLabel.textContent = "Python Live Audio";
    elements.playButton.textContent = "Listen";
    elements.playButton.disabled = false;
    elements.stopButton.disabled = true;
    refreshLiveAudioDevices();
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

async function refreshLiveAudioDevices() {
  elements.audioDevice.innerHTML = '<option value="default">Default Python input</option>';
  try {
    const response = await fetch("http://127.0.0.1:8790/devices", { cache: "no-store" });
    if (!response.ok) throw new Error(`live server ${response.status}`);
    const devices = await response.json();
    devices.filter(shouldShowLiveDevice).forEach((device) => {
      const option = document.createElement("option");
      option.value = String(device.index);
      option.textContent = normalizeLiveDeviceName(device.name, device.index);
      elements.audioDevice.appendChild(option);
    });
    setState("Live audio ready");
  } catch (_error) {
    setState("Start Python live server");
    logEvent("run: lighting-live-audio");
  }
}

function shouldShowLiveDevice(device) {
  const name = String(device.name || "").toLowerCase();
  if (name.includes("zoom")) return false;
  if (name.includes("teams")) return false;
  return true;
}

function normalizeLiveDeviceName(name, index) {
  const clean = String(name || "").trim();
  if (!clean) return index === 0 ? "Default Python input" : `Input ${index}`;
  if (/blackhole|loopback|soundflower|vb-cable|audio hijack/i.test(clean)) {
    return `${clean} (system loopback)`;
  }
  if (/macbook|built-in|microphone/i.test(clean)) {
    return "MacBook microphone";
  }
  return clean;
}

async function startLiveAudio() {
  await ensureAudioContext();
  stopPlayback({ resetPosition: false, keepLights: true });
  stopDeviceInput(false);
  stopLiveAudio(false);
  const selectedDevice = elements.audioDevice.value || "default";
  const url = `http://127.0.0.1:8790/events?device=${encodeURIComponent(selectedDevice)}`;
  liveEventSource = new EventSource(url);
  isPlaying = true;
  startedAt = audioContext.currentTime;
  pausedAt = 0;
  elements.playButton.textContent = "Pause";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.trackLabel.textContent = "Python Live Audio";
  setState("Live listening");
  logEvent("python live audio");
  liveEventSource.onmessage = (event) => {
    handleLiveAudioFrame(JSON.parse(event.data));
  };
  liveEventSource.onerror = () => {
    if (inputMode !== "system_audio") return;
    setState("Live audio error");
    logEvent("python live server disconnected");
    stopLiveAudio(false);
  };
}

function stopLiveAudio(resetUi = true) {
  if (liveEventSource) {
    liveEventSource.close();
  }
  liveEventSource = null;
  if (inputMode === "system_audio") {
    isPlaying = false;
    cancelAnimationFrame(animationFrame);
    if (resetUi) {
      setState("Live audio ready");
      elements.trackLabel.textContent = "Python Live Audio";
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      updateMeter(0);
      updatePlayerTime();
    }
  }
}

async function startDeviceInput() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setState("Mic error");
    logEvent("Mic Device richiede localhost o HTTPS");
    return;
  }

  await ensureAudioContext();
  stopPlayback({ resetPosition: false, keepLights: true });
  stopLiveAudio(false);
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

elements.timelineFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  event.target.value = "";
  if (file) {
    loadTimelineFile(file).catch((error) => {
      setState("Timeline error");
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
  } else if (inputMode === "system_audio") {
    stopLiveAudio();
    blackoutLights();
  } else if (inputMode === "timeline") {
    stopTimelinePlayback({ resetPosition: true });
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
  } else if (inputMode === "system_audio" && isPlaying) {
    startLiveAudio().catch((error) => {
      setState("Live audio error");
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      logEvent(error.message);
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
  if ((!hasLoadedAudio() || inputMode !== "file") && inputMode !== "timeline") return;
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

elements.trainingMode.addEventListener("change", () => {
  document.body.classList.toggle("is-training", isTrainingMode());
  logEvent(isTrainingMode() ? "training on" : "training off");
});

elements.saveAnnotationButton.addEventListener("click", () => {
  saveTrainingAnnotation();
});

elements.downloadAnnotationsButton.addEventListener("click", () => {
  downloadTrainingAnnotations();
});

elements.clearTrainingLightsButton.addEventListener("click", () => {
  clearTrainingLights();
});

elements.resetLayoutButton.addEventListener("click", () => {
  buildLights(Number(elements.lightCount.value), false);
  logEvent("layout reset");
});

function startDrag(event) {
  if (event.button !== 0) return;
  if (event.target.closest(".phase-button")) return;
  const light = event.currentTarget;
  const index = Number(light.dataset.index);
  light.setPointerCapture(event.pointerId);
  light.classList.add("dragging");
  dragging = { light, index, moved: false };
  light.addEventListener("pointermove", moveDraggedLight);
  light.addEventListener("pointerup", stopDrag);
  light.addEventListener("pointercancel", stopDrag);
}

function moveDraggedLight(event) {
  if (!dragging) return;
  const rect = elements.stage.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 6, 94);
  const previous = positions[dragging.index] ?? { x, y };
  if (Math.abs(previous.x - x) > 0.4 || Math.abs(previous.y - y) > 0.4) {
    dragging.moved = true;
  }
  positions[dragging.index] = { x, y };
  dragging.light.style.left = `${x}%`;
  dragging.light.style.top = `${y}%`;
  refreshLightPositionLabels();
}

function stopDrag(event) {
  const light = event.currentTarget;
  const wasClick = dragging && !dragging.moved;
  const index = dragging?.index;
  light.classList.remove("dragging");
  light.releasePointerCapture(event.pointerId);
  light.removeEventListener("pointermove", moveDraggedLight);
  light.removeEventListener("pointerup", stopDrag);
  light.removeEventListener("pointercancel", stopDrag);
  dragging = null;
  if (wasClick && Number.isInteger(index)) {
    cycleTrainingLight(index);
  }
}

buildLights(Number(elements.lightCount.value), false);
setInputMode(elements.inputSource.value);
drawTrackOverview();
updateTrainingSummary();
