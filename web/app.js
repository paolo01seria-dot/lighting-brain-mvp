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
  { name: "white", value: [245, 247, 248] },
  { name: "casual", value: null },
  { name: "blackout", value: [0, 0, 0], blackout: true },
];

const casualTrainingColors = [
  [255, 76, 91],
  [88, 221, 130],
  [255, 220, 88],
  [88, 123, 255],
  [174, 96, 255],
  [245, 247, 248],
];

const positionNaming = {
  totalFixtureSlots: 32,
  centreDeadbandPercent: 4,
  sideInnerPercent: 25,
};

const componentLaneNames = ["drum", "bass", "vocal", "other"];
const componentLaneLabels = {
  drum: "Drum",
  bass: "Bass",
  vocal: "Vocal",
  other: "Other",
};
const componentLaneWindowSeconds = 12;

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
  audioDeviceSummary: document.querySelector("#audioDeviceSummary"),
  trackLabel: document.querySelector("#trackLabel"),
  outputTarget: document.querySelector("#outputTarget"),
  outputLabel: document.querySelector("#outputLabel"),
  genreProfile: document.querySelector("#genreProfile"),
  playButton: document.querySelector("#playButton"),
  stopButton: document.querySelector("#stopButton"),
  reviewPlayButton: document.querySelector("#reviewPlayButton"),
  stateLabel: document.querySelector("#stateLabel"),
  energyLabel: document.querySelector("#energyLabel"),
  energyFill: document.querySelector("#energyFill"),
  trackOverview: document.querySelector("#trackOverview"),
  spectrumScroller: document.querySelector("#spectrumScroller"),
  liveSpectrum: document.querySelector("#liveSpectrum"),
  eventLog: document.querySelector("#eventLog"),
  lightCount: document.querySelector("#lightCount"),
  differentiation: document.querySelector("#differentiation"),
  differentiationValue: document.querySelector("#differentiationValue"),
  seekSlider: document.querySelector("#seekSlider"),
  currentTimeLabel: document.querySelector("#currentTimeLabel"),
  durationLabel: document.querySelector("#durationLabel"),
  trainingMode: document.querySelector("#trainingMode"),
  trainingDuration: document.querySelector("#trainingDuration"),
  sampleTagInput: document.querySelector("#sampleTagInput"),
  currentSampleCategory: document.querySelector("#currentSampleCategory"),
  currentSceneCategory: document.querySelector("#currentSceneCategory"),
  currentIntent: document.querySelector("#currentIntent"),
  currentGesture: document.querySelector("#currentGesture"),
  currentEnergyTrend: document.querySelector("#currentEnergyTrend"),
  cueNameInput: document.querySelector("#cueNameInput"),
  cueProbabilityInput: document.querySelector("#cueProbabilityInput"),
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
let reviewAnimationFrame;
let reviewAudioSource;
let reviewAudioElement;
let reviewAudioObjectUrl;
let reviewAudioUsesOriginalElement = false;
let reviewPlaybackStartedAt = 0;
let reviewPlaybackStartTime = 0;
let isPlaying = false;
let inputMode = "system_audio";
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
let componentHistory = [];

let lights = [];
let lightStates = [];
let positions = [];
let dragging = null;
let trainingAnnotations = [];
let selectedTrainingCueId = null;
let trainingCapture = {
  active: false,
  frames: [],
  cues: [],
  suppressedCueTimes: [],
  duration: 0,
  reviewTime: 0,
  startedAt: 0,
  source: null,
  audioSamples: [],
  audioSampleRate: null,
};

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
    ["bulb-base", "bulb-depth", "bulb-rim", "bulb-highlight"].forEach((className) => {
      const layer = document.createElement("span");
      layer.className = className;
      light.appendChild(layer);
    });
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
  document.body.classList.add("mode-timeline");
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
      if (reviewAnimationFrame && reviewAudioUsesOriginalElement) {
        pauseTrainingReviewPlayback();
        return;
      }
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
  beginTrainingCapture("file");
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
  stopTrainingCapture("paused");
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
  stopTrainingCapture(resetPosition ? "stopped" : "paused");
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
  componentHistory = [];
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
  beginTrainingCapture("timeline_json");
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
  stopTrainingCapture("paused");
  updatePlayerTime();
}

function stopTimelinePlayback(options = {}) {
  const { resetPosition = true, keepLights = false } = options;
  cancelAnimationFrame(timelineAnimationFrame);
  if (inputMode === "timeline") {
    isPlaying = false;
    stopTrainingCapture(resetPosition ? "stopped" : "paused");
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
  captureTrainingFrame({
    time,
    energy,
    energy_delta: energy - previousEnergy,
    spectral_flux: 0,
    sample_category: timelineCurrentRhythmEvent?.sample_category ?? timelineCurrentEvent?.sample_category,
  });
  updateMeter(energy);
  renderLights();
  updatePlayerTime();
  previousEnergy = energy;

  if (maybeFinishTrainingCapture(time)) return;
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
  const time = audioContext ? audioContext.currentTime - startedAt : 0;
  const energyDeltaForCapture = energy - previousEnergy;
  const componentLanes = componentLanesFromFrequency(frequencyData, spectralFlux, energy);
  drawComponentLanes(componentLanes, time, { beatPulse: shouldDrawBeatPulse(time) });
  updateLights(frequencyData, energy, rms, profile, spectralFlux);
  captureTrainingFrame({
    time,
    energy,
    energy_delta: energyDeltaForCapture,
    spectral_flux: spectralFlux,
    sample_category: categoryForEnergy(energy),
    component_lanes: componentLanes,
  });
  updateMeter(energy);
  updatePlayerTime();
  maybeLogSignal(energy);
  previousSpectrum = new Uint8Array(frequencyData);
  if (maybeFinishTrainingCapture(time)) return;

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
  const halfPulseStep = Math.floor(time / Math.max(interval / 2, 0.12));
  const differentiation = Number(elements.differentiation.value);
  const stableScene = differentiation >= 6;
  const weakGesture = !strong && (energy < 0.5 || clockSource === "mid_arpeggio");
  const pairCount = strong && !stableScene ? 2 : 1;

  if (weakGesture) {
    return mirrorSwapIndexes(halfPulseStep, count, sparse);
  }

  if (clockSource === "high_pattern" && strong) {
    return symmetricalIndexes(pulseStep, count, Math.min(count, 4));
  }

  return symmetricalIndexes(pulseStep, count, Math.min(count, pairCount * 2));
}

function musicalSingleOrPair(step, count, sparse) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(step, count);
  if (sparse || step % 4 !== 0) {
    return [pair[step % 2]];
  }
  return pair;
}

function mirrorSwapIndexes(step, count, sparse) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(Math.floor(step / 2), count);
  if (!sparse && step % 4 === 0) return pair;
  return [pair[step % pair.length]];
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
  const usedKeys = new Set();
  const candidates = positions
    .slice(0, count)
    .map((position, index) => ({ ...position, index, info: positionInfo(index) }))
    .sort((left, right) => symmetrySortScore(left) - symmetrySortScore(right));

  candidates.forEach((left) => {
    const right = candidates
      .filter((candidate) => candidate.index !== left.index)
      .sort((a, b) => mirroredDistance(left, a) - mirroredDistance(left, b))[0];
    if (!right) return;
    const pair = uniqueIndexes([left.index, right.index], count);
    const key = pair.slice().sort((a, b) => a - b).join(":");
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      pairs.push(pair);
    }
  });

  if (!pairs.length && count > 1) {
    pairs.push(uniqueIndexes([0, Math.floor(count / 2)], count));
  }
  return pairs.filter((pair) => pair.length > 0);
}

function symmetrySortScore(light) {
  const zoneOrder = { up: 0, middle: 1, down: 2 };
  const zone = zoneOrder[light.info.zone] ?? 3;
  const side = light.info.side === "centre" ? 1 : 0;
  const outer = light.info.outer ? 0 : 1;
  return zone * 1000 + side * 100 + outer * 10 + light.info.rank;
}

function mirroredDistance(left, right) {
  const mirrorX = 100 - left.x;
  const sameZonePenalty = left.info.zone === right.info.zone ? 0 : 22;
  const sameSidePenalty = left.info.side !== "centre" && left.info.side === right.info.side ? 18 : 0;
  const distance = Math.abs(right.x - mirrorX) + Math.abs(right.y - left.y) * 1.35;
  return distance + sameZonePenalty + sameSidePenalty;
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
  const interval = Math.max(musicalClock.interval ?? 0.5, 0.24);
  const beatStep = Math.floor(time / interval);
  const pairStep = beatStep + stablePhrase + sceneVariant + categoryOffset;
  const pairOffset = order > 1 ? Math.floor(order / 2) : 0;
  return profile.palette[(pairStep + pairOffset) % profile.palette.length];
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
  return casualTrainingColors[Math.floor(Math.random() * casualTrainingColors.length)];
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
    return { ...color, value: [245, 247, 248], randomizeOnPlayback: true };
  }
  return color;
}

function renderLights() {
  lights.forEach((light, index) => {
    const state = lightStates[index] ?? { intensity: 0, colorIndex: index % colors.length };
    const manual = state.manualColorIndex !== null && state.manualColorIndex !== undefined;
    const manualColor = manualLightColor(state);
    const color = manualColor ?? colors[state.colorIndex];
    const manualCasual = Boolean(manual && manualColor?.name === "casual");
    const [r, g, b] = color.value;
    const phaseFirst = state.phaseFirstHalf !== false;
    const phaseSecond = state.phaseSecondHalf !== false;
    const activePhaseCount = (phaseFirst ? 1 : 0) + (phaseSecond ? 1 : 0);
    const manualBlackout = Boolean(manual && (manualColor?.blackout || activePhaseCount === 0));
    const intensity = manual ? (manualBlackout ? 0 : 1) : clamp(state.intensity, 0, 1);
    const visible = intensity > 0.04;
    const phaseSplit = manual && (!phaseFirst || !phaseSecond);
    const flatColor = `rgb(${r}, ${g}, ${b})`;
    const lensFill = manualCasual
      ? "url('assets/casual-color.jpg') center / cover"
      : flatColor;
    const phaseColor = manualCasual
      ? "transparent"
      : `rgba(${r}, ${g}, ${b}, ${0.48 + intensity * 0.42})`;
    const phaseOff = "rgb(0, 0, 0)";
    const partialPhase = manual && activePhaseCount === 1;
    const showGlow = visible && !manualBlackout;
    const phaseOffMask = `linear-gradient(90deg, ${phaseFirst ? "transparent" : phaseOff} 0 50%, ${phaseFirst ? "transparent" : phaseOff} 50%, ${phaseSecond ? "transparent" : phaseOff} 50%, ${phaseSecond ? "transparent" : phaseOff} 100%)`;
    const phaseLensFill = phaseSplit
      ? manualCasual
        ? `${phaseOffMask}, url('assets/casual-color.jpg') center / cover`
        : `linear-gradient(90deg, ${phaseFirst ? flatColor : phaseOff} 0 50%, ${phaseFirst ? flatColor : phaseOff} 50%, ${phaseSecond ? flatColor : phaseOff} 50%, ${phaseSecond ? flatColor : phaseOff} 100%)`
      : "";
    const flatBulbFill = visible && !manualBlackout
      ? lensFill
      : "";
    const flatPhaseFill = phaseSplit
      ? manualCasual
        ? `${phaseOffMask}, url('assets/casual-color.jpg') center / cover`
        : `linear-gradient(90deg, ${phaseFirst ? flatColor : phaseOff} 0 50%, ${phaseFirst ? flatColor : phaseOff} 50%, ${phaseSecond ? flatColor : phaseOff} 50%, ${phaseSecond ? flatColor : phaseOff} 100%)`
      : flatBulbFill;
    const leftPhaseButton = light.querySelector('[data-phase="first"]');
    const rightPhaseButton = light.querySelector('[data-phase="second"]');

    light.style.background = visible
      ? manualCasual
        ? ""
        : phaseSplit
        ? ""
        : ""
      : "";
    light.style.opacity = visible ? "1" : "0.82";
    light.style.boxShadow = showGlow
      ? `0 0 ${Math.round(10 + intensity * 54)}px rgba(${r}, ${g}, ${b}, ${intensity * 0.84})`
      : "";
    light.style.setProperty("--beam", showGlow ? `rgba(${r}, ${g}, ${b}, ${intensity})` : "transparent");
    light.style.setProperty("--beam-opacity", showGlow ? String(intensity * 0.42) : "0");
    light.style.setProperty("--lens-fill", visible && !manualBlackout ? (phaseSplit ? phaseLensFill : lensFill) : "");
    if (phaseLensFill) {
      light.style.setProperty("--phase-lens-fill", phaseLensFill);
    } else {
      light.style.removeProperty("--phase-lens-fill");
    }
    light.style.setProperty("--phase-left", phaseFirst ? phaseColor : phaseOff);
    light.style.setProperty("--phase-right", phaseSecond ? phaseColor : phaseOff);
    light.style.setProperty("--phase-button-color", `rgba(${r}, ${g}, ${b}, 0.88)`);
    if (flatBulbFill) {
      light.style.setProperty("--flat-bulb-fill", flatBulbFill);
      light.style.setProperty("--flat-phase-fill", flatPhaseFill);
    } else {
      light.style.removeProperty("--flat-bulb-fill");
      light.style.removeProperty("--flat-phase-fill");
    }
    light.classList.toggle("active", intensity > 0.62);
    light.classList.toggle("manual", manual);
    light.classList.toggle("casual", manualCasual && !manualBlackout);
    light.classList.toggle("phase-split", phaseSplit);
    light.classList.toggle("blackout", manualBlackout);
    light.classList.toggle("flat-visible", Boolean(flatBulbFill));
    leftPhaseButton?.classList.toggle("is-off", !phaseFirst || manualBlackout);
    rightPhaseButton?.classList.toggle("is-off", !phaseSecond || manualBlackout);
    leftPhaseButton?.classList.toggle("is-casual", manualCasual && !manualBlackout);
    rightPhaseButton?.classList.toggle("is-casual", manualCasual && !manualBlackout);
    leftPhaseButton?.classList.toggle("is-selected", partialPhase && phaseFirst && !manualBlackout);
    rightPhaseButton?.classList.toggle("is-selected", partialPhase && phaseSecond && !manualBlackout);
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
  const componentLanes = frame.component_lanes
    ? normalizeComponentLanes(frame.component_lanes)
    : componentLanesFromFrequency(frequencyData, Number(frame.spectral_flux ?? 0), energy);
  drawComponentLanes(componentLanes, time, { beatPulse: shouldDrawBeatPulse(time) });
  if (frame.sample_category === "silence_or_pause" || frame.sample_category === "stop_music_moment" || frame.energy_drop > 0.18) {
    blackoutLights();
    captureTrainingAudio(frame);
    captureTrainingFrame({
      time,
      energy,
      energy_delta: Number(frame.energy_delta ?? 0),
      spectral_flux: Number(frame.spectral_flux ?? 0),
      sample_category: frame.sample_category ?? "silence_or_pause",
      component_lanes: componentLanes,
    });
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
    maybeFinishTrainingCapture(time);
    return;
  }
  updateLights(frequencyData, energy, rms, profile, Number(frame.spectral_flux ?? 0));
  captureTrainingAudio(frame);
  captureTrainingFrame({
    time,
    energy,
    energy_delta: Number(frame.energy_delta ?? 0),
    spectral_flux: Number(frame.spectral_flux ?? 0),
    sample_category: frame.sample_category,
    component_lanes: componentLanes,
  });
  updateMeter(energy);
  updatePlayerTime();
  maybeLogLiveFrame(frame);
  previousSpectrum = new Uint8Array(frequencyData);
  maybeFinishTrainingCapture(time);
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
  if (inputMode === "file" && trainingReviewAvailable() && !isPlaying) {
    if (reviewAnimationFrame && reviewAudioUsesOriginalElement && audioElement) {
      return clamp(audioElement.currentTime || trainingCapture.reviewTime, 0, trainingCapture.duration);
    }
    return clamp(trainingCapture.reviewTime, 0, trainingCapture.duration);
  }
  if ((inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && trainingCapture.frames.length) {
    return clamp(trainingCapture.reviewTime, 0, trainingCapture.duration);
  }
  if (inputMode === "mic_device" || inputMode === "system_audio") {
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
  const reviewMode = trainingReviewAvailable() && (inputMode === "file" || inputMode === "mic_device" || inputMode === "system_audio");
  const liveReview = (inputMode === "mic_device" || inputMode === "system_audio") && trainingCapture.frames.length;
  const duration = reviewMode ? trainingCapture.duration : inputMode === "mic_device" || inputMode === "system_audio" ? 0 : getAudioDuration();
  elements.currentTimeLabel.textContent = formatTime(Math.floor(current));
  elements.durationLabel.textContent = (inputMode === "mic_device" || inputMode === "system_audio") && !reviewMode ? "live" : formatTime(Math.floor(duration));
  drawOverviewPlayhead(current, duration);
  updateTrainingReadout(current);
  if (reviewMode && !isPlaying) {
    elements.seekSlider.disabled = false;
    elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
    return;
  }
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
  if ((inputMode === "file" || inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && applyTrainingReviewFrame(time)) {
    return;
  }
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

function componentLanesFromFrequency(frequencyData, spectralFlux = 0, energy = 0) {
  const bands = getBands(frequencyData, 8);
  const low = (bands[0] ?? 0) * 0.72 + (bands[1] ?? 0) * 0.42;
  const lowMid = (bands[2] ?? 0) * 0.36 + (bands[3] ?? 0) * 0.44;
  const mid = (bands[3] ?? 0) * 0.3 + (bands[4] ?? 0) * 0.5 + (bands[5] ?? 0) * 0.2;
  const high = (bands[6] ?? 0) * 0.4 + (bands[7] ?? 0) * 0.6;
  const transient = clamp(spectralFlux * 4.5, 0, 1);
  const bass = clamp(low * 1.85, 0, 1);
  const drum = clamp(transient * 0.74 + low * 0.34 + high * 0.32, 0, 1);
  const vocal = clamp((lowMid * 0.35 + mid * 0.85) * (1 - transient * 0.22), 0, 1);
  const other = clamp((mid * 0.35 + high * 0.42 + energy * 0.32) * (1 - bass * 0.12), 0, 1);
  return {
    drum: roundNumber(drum, 4),
    bass: roundNumber(bass, 4),
    vocal: roundNumber(vocal, 4),
    other: roundNumber(other, 4),
  };
}

function normalizeComponentLanes(componentLanes) {
  if (!componentLanes) return null;
  return componentLaneNames.reduce((lanes, name) => {
    lanes[name] = roundNumber(clamp(componentLanes[name] ?? 0, 0, 1), 4);
    return lanes;
  }, {});
}

function strongestComponentLane(componentLanes) {
  if (!componentLanes) return "-";
  let strongest = "drum";
  componentLaneNames.forEach((name) => {
    if ((componentLanes[name] ?? 0) > (componentLanes[strongest] ?? 0)) {
      strongest = name;
    }
  });
  return `${componentLaneLabels[strongest]} ${Math.round((componentLanes[strongest] ?? 0) * 100)}%`;
}

function shouldDrawBeatPulse(time) {
  if (!musicalClock.interval || musicalClock.confidence < 0.18 || musicalClock.lastPulseTime === null) return false;
  return Math.abs(time - musicalClock.lastPulseTime) < 0.08;
}

function trainingReviewAvailable() {
  return !trainingCapture.active && trainingCapture.frames.length > 0;
}

function trainingReviewCueTimes() {
  if (!trainingCapture.frames.length) return [];
  const times = new Set(trainingReviewAutomaticCueTimes());
  trainingCapture.cues.forEach((cue) => times.add(roundNumber(cue.time, 4)));
  return [...times]
    .filter((time) => !isSuppressedCueTime(time))
    .sort((left, right) => left - right);
}

function trainingReviewAutomaticCueTimes() {
  if (!trainingCapture.frames.length) return [];
  const times = new Set([0, roundNumber(trainingCapture.duration, 4)]);
  const intervals = trainingCapture.frames
    .map((frame) => Number(frame.rhythm_split?.base_interval_seconds))
    .filter((interval) => Number.isFinite(interval) && interval >= 0.12 && interval <= 2);
  const sortedIntervals = intervals.sort((left, right) => left - right);
  const interval = sortedIntervals.length ? sortedIntervals[Math.floor(sortedIntervals.length / 2)] : 0.5;
  for (let time = 0; time <= trainingCapture.duration + interval * 0.5; time += interval) {
    times.add(roundNumber(clamp(time, 0, trainingCapture.duration), 4));
  }
  return [...times].sort((left, right) => left - right);
}

function isSuppressedCueTime(time) {
  return (trainingCapture.suppressedCueTimes ?? []).some((suppressedTime) => (
    Math.abs(suppressedTime - time) <= cueHitThresholdSeconds()
  ));
}

function snapTrainingReviewTime(rawTime) {
  const times = trainingReviewCueTimes();
  if (!times.length) return clamp(rawTime, 0, trainingCapture.duration);
  return times.reduce((nearest, time) => (
    Math.abs(time - rawTime) < Math.abs(nearest - rawTime) ? time : nearest
  ), times[0]);
}

function captureLightSnapshot() {
  return lightStates.map((state) => ({
    intensity: roundNumber(state.intensity ?? 0, 4),
    age: state.age ?? 0,
    colorIndex: state.colorIndex ?? 0,
    manualColorIndex: state.manualColorIndex ?? null,
    manualRandomColor: state.manualRandomColor ?? null,
    phaseFirstHalf: state.phaseFirstHalf !== false,
    phaseSecondHalf: state.phaseSecondHalf !== false,
  }));
}

function applyLightSnapshot(snapshot) {
  if (!Array.isArray(snapshot)) return false;
  snapshot.forEach((state, index) => {
    if (!lightStates[index]) return;
    lightStates[index] = {
      ...lightStates[index],
      intensity: clamp(Number(state.intensity ?? 0), 0, 1),
      age: Number(state.age ?? 0),
      colorIndex: clamp(Math.round(Number(state.colorIndex ?? 0)), 0, colors.length - 1),
      manualColorIndex: state.manualColorIndex,
      manualRandomColor: state.manualRandomColor,
      phaseFirstHalf: state.phaseFirstHalf !== false,
      phaseSecondHalf: state.phaseSecondHalf !== false,
    };
  });
  renderLights();
  return true;
}

function persistCurrentTrainingFrameScene() {
  if (!canEditTrainingScene()) return null;
  const time = currentPlaybackTime();
  const frame = findTrainingFrameAt(time);
  if (!frame) return null;
  const scene = {
    source: "user_scene",
    edited_at: new Date().toISOString(),
    time: roundNumber(frame.time, 4),
    review_time: roundNumber(time, 4),
    sample_category: frame.sample_category ?? null,
    scene_category: `${frame.scene_category ?? "training_scene"}__user`,
    intent: frame.intent ?? null,
    dominant_component: frame.dominant_component ?? frame.clock_source ?? null,
    energy_trend: frame.energy_trend ?? null,
    light_snapshot: captureLightSnapshot(),
  };
  frame.user_scene = scene;
  frame.final_scene = scene;
  elements.currentSampleCategory.textContent = scene.sample_category ?? "-";
  elements.currentSceneCategory.textContent = scene.scene_category ?? "-";
  elements.currentIntent.textContent = scene.intent ?? "-";
  elements.currentGesture.textContent = scene.dominant_component ?? "-";
  elements.currentEnergyTrend.textContent = scene.energy_trend ?? "-";
  return frame;
}

function drawComponentLanes(componentLanes, time, options = {}) {
  const canvas = elements.liveSpectrum;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  updateSpectrumCanvasWidth();
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

  if (Number.isFinite(time)) {
    componentHistory.push({ time, lanes: componentLanes, beat: Boolean(options.beatPulse) });
    componentHistory = componentHistory.filter((item) => time - item.time <= componentLaneWindowSeconds);
  }

  const laneHeight = height / componentLaneNames.length;
  componentLaneNames.forEach((_name, laneIndex) => {
    const y = laneIndex * laneHeight;
    context.fillStyle = laneIndex % 2 === 0 ? "rgba(255, 255, 255, 0.018)" : "rgba(255, 255, 255, 0.036)";
    context.fillRect(0, y, width, laneHeight);
    context.strokeStyle = "rgba(145, 163, 168, 0.18)";
    context.beginPath();
    context.moveTo(0, y + laneHeight);
    context.lineTo(width, y + laneHeight);
    context.stroke();
  });

  const colorByLane = {
    drum: [255, 196, 87],
    bass: [88, 123, 255],
    vocal: [255, 132, 60],
    other: [245, 247, 248],
  };
  const reviewMode = !trainingCapture.active && trainingCapture.frames.length > 0;
  const history = reviewMode
    ? trainingCapture.frames.map((frame) => ({
      time: frame.time,
      lanes: frame.component_lanes,
      beat: Boolean(frame.rhythm_split?.fastest_component),
    }))
    : componentHistory;
  const captureDuration = reviewMode ? trainingCapture.duration : componentLaneWindowSeconds;
  const currentTime = reviewMode ? currentPlaybackTime() : Number.isFinite(time) ? time : history.at(-1)?.time ?? 0;
  const windowStart = reviewMode ? 0 : currentTime - componentLaneWindowSeconds;
  history.forEach((point, pointIndex) => {
    const progress = reviewMode
      ? clamp(point.time / Math.max(captureDuration, 0.001), 0, 1)
      : clamp((point.time - windowStart) / componentLaneWindowSeconds, 0, 1);
    const pointX = progress * width;
    if (point.beat) {
      context.strokeStyle = "rgba(255, 255, 255, 0.42)";
      context.lineWidth = Math.max(1, ratio);
      context.beginPath();
      context.moveTo(pointX, 0);
      context.lineTo(pointX, height);
      context.stroke();
    }
    componentLaneNames.forEach((name, laneIndex) => {
      const value = clamp(point.lanes?.[name] ?? 0, 0, 1);
      const previous = history[pointIndex - 1];
      const previousValue = clamp(previous?.lanes?.[name] ?? value, 0, 1);
      const previousProgress = previous
        ? reviewMode
          ? clamp(previous.time / Math.max(captureDuration, 0.001), 0, 1)
          : clamp((previous.time - windowStart) / componentLaneWindowSeconds, 0, 1)
        : progress;
      const previousX = previousProgress * width;
      const yBase = laneIndex * laneHeight + laneHeight * 0.82;
      const y = yBase - value * laneHeight * 0.62;
      const previousY = yBase - previousValue * laneHeight * 0.62;
      const [r, g, b] = colorByLane[name];
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.36 + value * 0.5})`;
      context.lineWidth = Math.max(1, 1.6 * ratio);
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(pointX, y);
      context.stroke();
      if (value > 0.42) {
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.08 + value * 0.24})`;
        context.fillRect(pointX - 1 * ratio, laneIndex * laneHeight + laneHeight * 0.15, 2 * ratio, laneHeight * 0.7);
      }
    });
  });

  drawTrainingCueMarkers(context, width, height, ratio, captureDuration, reviewMode ? currentTime : null);

  if (reviewMode && reviewAnimationFrame) {
    followSpectrumPlayhead(currentTime, captureDuration);
  }
}

function updateSpectrumCanvasWidth() {
  const canvas = elements.liveSpectrum;
  const scroller = elements.spectrumScroller;
  if (!canvas || !scroller) return;
  const reviewMode = !trainingCapture.active && trainingCapture.frames.length > 0;
  if (!reviewMode) {
    canvas.style.width = "100%";
    return;
  }
  const visibleWidth = scroller.clientWidth || canvas.getBoundingClientRect().width || 980;
  const pixelsPerSecond = 82;
  const width = Math.max(visibleWidth, Math.round(trainingCapture.duration * pixelsPerSecond));
  canvas.style.width = `${width}px`;
}

function followSpectrumPlayhead(currentTime, duration) {
  const canvas = elements.liveSpectrum;
  const scroller = elements.spectrumScroller;
  if (!canvas || !scroller || !duration) return;
  const canvasWidth = canvas.getBoundingClientRect().width;
  const x = clamp(currentTime / Math.max(duration, 0.001), 0, 1) * canvasWidth;
  const leftEdge = scroller.scrollLeft;
  const rightEdge = leftEdge + scroller.clientWidth;
  const margin = Math.min(180, scroller.clientWidth * 0.34);
  if (x < leftEdge + margin || x > rightEdge - margin) {
    scroller.scrollLeft = clamp(x - scroller.clientWidth * 0.45, 0, canvasWidth - scroller.clientWidth);
  }
}

function drawTrainingCueMarkers(context, width, height, ratio, duration, currentTime) {
  if (!trainingReviewAvailable()) return;
  trainingReviewCueTimes().forEach((time) => {
    const x = clamp(time / Math.max(duration, 0.001), 0, 1) * width;
    context.strokeStyle = "rgba(255, 255, 255, 0.16)";
    context.lineWidth = Math.max(1, ratio);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  });
  trainingCapture.cues.forEach((cue) => {
    const x = clamp(cue.time / Math.max(duration, 0.001), 0, 1) * width;
    context.strokeStyle = "rgba(255, 196, 87, 0.86)";
    context.lineWidth = Math.max(1, 1.5 * ratio);
    context.setLineDash([4 * ratio, 4 * ratio]);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(255, 196, 87, 0.92)";
    context.font = `${Math.round(10 * ratio)}px system-ui, sans-serif`;
    context.textBaseline = "top";
    context.fillText(cue.name, x + 4 * ratio, 4 * ratio);
  });
  if (Number.isFinite(currentTime)) {
    const x = clamp(currentTime / Math.max(duration, 0.001), 0, 1) * width;
    context.strokeStyle = "rgba(255, 255, 255, 0.96)";
    context.lineWidth = Math.max(1, 1.2 * ratio);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
}

function cueTimeFromCanvasEvent(event) {
  const rect = elements.liveSpectrum.getBoundingClientRect();
  const progress = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
  return progress * Math.max(trainingCapture.duration, 0.001);
}

function cueHitThresholdSeconds() {
  const rect = elements.liveSpectrum.getBoundingClientRect();
  const secondsPerPixel = trainingCapture.duration / Math.max(rect.width, 1);
  return Math.max(0.08, secondsPerPixel * 14);
}

function nearestCueHit(time) {
  const threshold = cueHitThresholdSeconds();
  const manual = trainingCapture.cues
    .map((cue, index) => ({ type: "manual", cue, index, time: cue.time, distance: Math.abs(cue.time - time) }))
    .filter((hit) => hit.distance <= threshold);
  const automatic = trainingReviewAutomaticCueTimes()
    .filter((cueTime) => cueTime > cueHitThresholdSeconds() && cueTime < trainingCapture.duration - cueHitThresholdSeconds())
    .filter((cueTime) => !isSuppressedCueTime(cueTime))
    .map((cueTime) => ({ type: "automatic", time: cueTime, distance: Math.abs(cueTime - time) }))
    .filter((hit) => hit.distance <= threshold);
  return [...manual, ...automatic].sort((left, right) => left.distance - right.distance)[0] ?? null;
}

function toggleTrainingCueAt(time) {
  const hit = nearestCueHit(time);
  if (hit?.type === "manual") {
    const [removed] = trainingCapture.cues.splice(hit.index, 1);
    if (selectedTrainingCueId === removed.id) selectedTrainingCueId = null;
    updateCueEditor();
    updateTrainingSummary();
    redrawTrainingReview();
    logEvent(`cue removed ${removed.name}`);
    return;
  }
  if (hit?.type === "automatic") {
    trainingCapture.suppressedCueTimes = [
      ...(trainingCapture.suppressedCueTimes ?? []),
      roundNumber(hit.time, 4),
    ];
    updateTrainingSummary();
    redrawTrainingReview();
    logEvent(`auto cue removed ${formatTime(Math.floor(hit.time))}`);
    return;
  }
  addTrainingCue(time);
}

function addTrainingCue(time) {
  if (!canEditTrainingScene()) return;
  const cueTime = roundNumber(clamp(time, 0, trainingCapture.duration), 4);
  const frame = findTrainingFrameAt(cueTime);
  const rhythmSplit = estimateFastestRhythmSplit(cueTime);
  const component = rhythmSplit.fastest_component ?? dominantComponentName(frame?.component_lanes) ?? "sound";
  const cue = {
    id: `cue_${String(trainingCapture.cues.length + 1).padStart(3, "0")}`,
    name: `${component}_cue_${String(trainingCapture.cues.length + 1).padStart(2, "0")}`,
    time: cueTime,
    probability: 0.9,
    split_type: "sound_scene_split",
    sample_category: frame?.sample_category ?? null,
    scene_category: frame?.scene_category ?? null,
    dominant_component: component,
    fastest_component_bpm: rhythmSplit.fastest_component_bpm,
    rhythm_split: rhythmSplit,
  };
  trainingCapture.cues.push(cue);
  trainingCapture.cues.sort((left, right) => left.time - right.time);
  selectedTrainingCueId = cue.id;
  seekToSliderValue((cueTime / Math.max(trainingCapture.duration, 0.001)) * 1000).catch((error) => {
    setState("Cue seek error");
    logEvent(error.message);
  });
  updateTrainingSummary();
  redrawTrainingReview();
  logEvent(`cue ${cue.name} ${formatTime(Math.floor(cueTime))}`);
}

function selectedTrainingCue() {
  return trainingCapture.cues.find((cue) => cue.id === selectedTrainingCueId) ?? null;
}

function updateCueEditor() {
  const cue = selectedTrainingCue();
  const enabled = canEditTrainingScene() && Boolean(cue);
  elements.cueNameInput.disabled = !enabled;
  elements.cueProbabilityInput.disabled = !enabled;
  elements.cueNameInput.value = cue?.name ?? "";
  elements.cueProbabilityInput.value = String(cue?.probability ?? 0.9);
  elements.cueNameInput.placeholder = enabled ? "cue name" : "no cue";
}

function estimateFastestRhythmSplit(time) {
  const windowStart = Math.max(0, time - 3);
  const windowEnd = Math.min(trainingCapture.duration, time + 3);
  const frames = trainingCapture.frames.filter((frame) => frame.time >= windowStart && frame.time <= windowEnd);
  const laneStats = componentLaneNames.map((name) => {
    const peaks = componentPeaks(frames, name);
    const bpm = bpmFromPeaks(peaks);
    return { component: name, bpm, peaks: peaks.length };
  }).filter((stat) => stat.bpm);
  laneStats.sort((left, right) => right.bpm - left.bpm);
  const fastest = laneStats[0];
  const baseInterval = musicalClock.interval || (fastest?.bpm ? 60 / fastest.bpm : null);
  return {
    fastest_component: fastest?.component ?? null,
    fastest_component_bpm: fastest ? roundNumber(fastest.bpm, 2) : null,
    base_interval_seconds: baseInterval ? roundNumber(baseInterval, 4) : null,
    split_reason: fastest
      ? `${fastest.component} pulses faster than the global groove`
      : "manual split without enough component peaks",
    candidate_components: laneStats.map((stat) => ({
      component: stat.component,
      bpm: roundNumber(stat.bpm, 2),
      peaks: stat.peaks,
    })),
  };
}

function componentPeaks(frames, component) {
  const peaks = [];
  for (let index = 1; index < frames.length - 1; index += 1) {
    const previous = frames[index - 1].component_lanes?.[component] ?? 0;
    const current = frames[index].component_lanes?.[component] ?? 0;
    const next = frames[index + 1].component_lanes?.[component] ?? 0;
    if (current > 0.38 && current >= previous * 1.08 && current >= next * 1.08) {
      const lastPeak = peaks.at(-1);
      if (!lastPeak || frames[index].time - lastPeak > 0.16) {
        peaks.push(frames[index].time);
      }
    }
  }
  return peaks;
}

function bpmFromPeaks(peaks) {
  if (peaks.length < 2) return null;
  const intervals = [];
  for (let index = 0; index < peaks.length - 1; index += 1) {
    const interval = peaks[index + 1] - peaks[index];
    if (interval >= 0.12 && interval <= 2.0) intervals.push(interval);
  }
  if (!intervals.length) return null;
  const mean = average(intervals);
  return mean > 0 ? 60 / mean : null;
}

function dominantComponentName(componentLanes) {
  if (!componentLanes) return null;
  let strongest = componentLaneNames[0];
  componentLaneNames.forEach((name) => {
    if ((componentLanes[name] ?? 0) > (componentLanes[strongest] ?? 0)) strongest = name;
  });
  return strongest;
}

function redrawTrainingReview() {
  if (!trainingReviewAvailable()) return;
  const frame = findTrainingFrameAt(currentPlaybackTime()) ?? trainingCapture.frames.at(-1);
  drawComponentLanes(frame?.component_lanes ?? null, currentPlaybackTime());
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
  if ((inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && trainingCapture.frames.length) {
    pauseTrainingReviewPlayback();
    const rawTime = (Number(value) / 1000) * trainingCapture.duration;
    const time = snapTrainingReviewTime(rawTime);
    applyTrainingReviewFrame(time);
    redrawTrainingReview();
    updatePlayerTime();
    return;
  }
  if (inputMode === "file" && !isPlaying && trainingReviewAvailable()) {
    pauseTrainingReviewPlayback();
    const rawTime = (Number(value) / 1000) * trainingCapture.duration;
    const time = snapTrainingReviewTime(rawTime);
    if (audioElement) {
      audioElement.currentTime = clamp(time, 0, getAudioDuration());
    }
    applyTrainingReviewFrame(time);
    redrawTrainingReview();
    updatePlayerTime();
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

function canEditTrainingScene() {
  return isTrainingMode() && !trainingCapture.active && trainingCapture.frames.length > 0;
}

function updateTrainingEditState() {
  const editable = canEditTrainingScene();
  document.body.classList.toggle("is-training-edit", editable);
  elements.saveAnnotationButton.disabled = !editable;
  elements.clearTrainingLightsButton.disabled = !editable;
  updateCueEditor();
  updateReviewPlayButton();
}

function selectedTrainingDuration() {
  return Math.max(1, Number(elements.trainingDuration?.value ?? 30));
}

function beginTrainingCapture(source) {
  if (!isTrainingMode()) return;
  pauseTrainingReviewPlayback();
  if (elements.spectrumScroller) {
    elements.spectrumScroller.scrollLeft = 0;
  }
  componentHistory = [];
  trainingCapture = {
    active: true,
    frames: [],
    cues: [],
    suppressedCueTimes: [],
    duration: selectedTrainingDuration(),
    reviewTime: 0,
    startedAt: audioContext?.currentTime ?? 0,
    source,
    audioSamples: [],
    audioSampleRate: null,
  };
  selectedTrainingCueId = null;
  elements.seekSlider.disabled = true;
  elements.durationLabel.textContent = formatTime(trainingCapture.duration);
  updateTrainingSummary();
  updateTrainingEditState();
  logEvent(`training capture ${formatTime(trainingCapture.duration)}`);
}

function stopTrainingCapture(reason = "stopped") {
  if (!trainingCapture.active) return;
  trainingCapture.active = false;
  trainingCapture.reviewTime = 0;
  elements.seekSlider.disabled = !trainingCapture.frames.length;
  updateTrainingSummary();
  updateTrainingEditState();
  if (trainingCapture.frames.length) {
    applyTrainingReviewFrame(0);
    redrawTrainingReview();
  }
  logEvent(`training ${reason}: ${trainingCapture.frames.length} frames`);
}

function maybeFinishTrainingCapture(time) {
  if (!trainingCapture.active) return false;
  if (time < trainingCapture.duration) return false;
  stopTrainingCapture("complete");
  if (inputMode === "mic_device") {
    stopDeviceInput();
  } else if (inputMode === "system_audio") {
    stopLiveAudio();
  } else if (inputMode === "timeline") {
    pauseTimeline();
  } else {
    pauseAudio();
  }
  return true;
}

function captureTrainingFrame(reading) {
  if (!trainingCapture.active) return;
  const time = roundNumber(reading.time ?? currentPlaybackTime(), 4);
  const previous = trainingCapture.frames[trainingCapture.frames.length - 1];
  if (previous && time - previous.time < 0.18) return;
  const category = reading.sample_category ?? categoryForEnergy(reading.energy ?? 0);
  const sceneChanged = updateCategoryScene(category);
  const componentLanes = normalizeComponentLanes(reading.component_lanes);
  const frame = {
    time,
    source: trainingCapture.source ?? inputMode,
    genre: elements.genreProfile.value,
    sample_category: category,
    sample_tag: normalizeSampleTag(elements.sampleTagInput.value),
    scene_category: sceneCategoryForSample(category, sceneChanged),
    scene_pool_hint: scenePoolHint(category),
    intent: intentForSample(category, reading.energy ?? 0),
    energy: roundNumber(reading.energy ?? 0, 4),
    energy_trend: energyTrend(reading.energy_delta ?? ((reading.energy ?? 0) - previousEnergy)),
    spectral_flux: roundNumber(reading.spectral_flux ?? 0, 4),
    component_lanes: componentLanes,
    dominant_component: strongestComponentLane(componentLanes),
    rhythm_split: estimateFastestRhythmSplit(time),
    clock_source: musicalClock.source,
    light_snapshot: captureLightSnapshot(),
  };
  trainingCapture.frames.push(frame);
  elements.currentSampleCategory.textContent = frame.sample_category ?? "-";
  elements.currentSceneCategory.textContent = frame.scene_category ?? "-";
  elements.currentIntent.textContent = frame.intent ?? "-";
  elements.currentGesture.textContent = frame.dominant_component ?? frame.clock_source ?? "-";
  elements.currentEnergyTrend.textContent = frame.energy_trend ?? "-";
  updateTrainingEditState();
}

function captureTrainingAudio(frame) {
  if (!trainingCapture.active) return;
  const samples = Array.isArray(frame.audio_samples) ? frame.audio_samples : [];
  const sampleRate = Number(frame.audio_sample_rate);
  if (!samples.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return;
  if (!trainingCapture.audioSampleRate) {
    trainingCapture.audioSampleRate = sampleRate;
  }
  if (trainingCapture.audioSampleRate !== sampleRate) return;
  trainingCapture.audioSamples.push(...samples.map((sample) => clamp(Number(sample), -1, 1)));
}

function sceneCategoryForSample(category, sceneChanged) {
  const genre = elements.genreProfile.value;
  const variant = currentSceneByCategory[category] ?? 0;
  if (category === "high_energy_drop") return `${genre}_drop_mirror_release_${variant}`;
  if (category === "buildup") return `${genre}_tension_mirror_rise_${variant}`;
  if (category === "steady_bass_pulse") return `${genre}_mirror_groove_swap_${variant}`;
  if (category === "stop_music_moment" || category === "silence_or_pause") return "blackout_or_freeze";
  return sceneChanged ? `${genre}_sparse_mirror_shift_${variant}` : `${genre}_sparse_mirror_hold`;
}

function scenePoolHint(category) {
  const pairs = buildSymmetryPairs(lights.length).slice(0, 6).map((pair) => pair.map((index) => positionName(index)));
  const timing = category === "steady_bass_pulse" ? "bpm_or_half_bpm_swap" : category === "high_energy_drop" ? "mirrored_pair_flash" : "sparse_mirror_accent";
  return {
    timing,
    allowed_motion: "mirror_pairs_only",
    forbidden_motion: "continuous_ring_chase",
    candidate_pairs: pairs,
  };
}

function intentForSample(category, energy) {
  if (category === "high_energy_drop") return "release_energy";
  if (category === "buildup") return "increase_tension";
  if (category === "steady_bass_pulse") return "keep_groove_visible";
  if (category === "stop_music_moment" || category === "silence_or_pause") return "emphasize_stop";
  return energy > 0.2 ? "support_texture" : "create_space";
}

function energyTrend(delta) {
  if (delta > 0.055) return "rising";
  if (delta < -0.055) return "falling";
  return "stable";
}

function applyTrainingReviewFrame(time) {
  if (trainingCapture.active || !trainingCapture.frames.length) return false;
  trainingCapture.reviewTime = clamp(time, 0, trainingCapture.duration);
  let frame = trainingCapture.frames[0];
  for (const candidate of trainingCapture.frames) {
    if (candidate.time > trainingCapture.reviewTime) break;
    frame = candidate;
  }
  const finalScene = frame.final_scene ?? frame.user_scene ?? null;
  elements.currentSampleCategory.textContent = finalScene?.sample_category ?? frame.sample_category ?? "-";
  elements.currentSceneCategory.textContent = finalScene?.scene_category ?? frame.scene_category ?? "-";
  elements.currentIntent.textContent = finalScene?.intent ?? frame.intent ?? "-";
  elements.currentGesture.textContent = finalScene?.dominant_component ?? frame.dominant_component ?? frame.clock_source ?? "-";
  elements.currentEnergyTrend.textContent = finalScene?.energy_trend ?? frame.energy_trend ?? "-";
  const cue = findTrainingCueAt(trainingCapture.reviewTime);
  if (cue) selectedTrainingCueId = cue.id;
  updateCueEditor();
  updateMeter(frame.energy ?? 0);
  if (!applyLightSnapshot(finalScene?.light_snapshot ?? frame.light_snapshot)) {
    if (frame.sample_category === "silence_or_pause" || frame.sample_category === "stop_music_moment") {
      blackoutLights();
    }
  }
  return true;
}

function updateReviewPlayButton() {
  if (!elements.reviewPlayButton) return;
  const enabled = trainingReviewAvailable() && (inputMode === "file" || inputMode === "mic_device" || inputMode === "system_audio");
  elements.reviewPlayButton.disabled = !enabled;
  elements.reviewPlayButton.textContent = reviewAnimationFrame ? "⏸" : "▶";
}

function pauseTrainingReviewPlayback() {
  if (reviewAnimationFrame) {
    cancelAnimationFrame(reviewAnimationFrame);
  }
  reviewAnimationFrame = null;
  stopReviewAudioSource();
  updateReviewPlayButton();
}

function currentReviewAudioTime() {
  if (reviewAudioUsesOriginalElement && audioElement) {
    return clamp(audioElement.currentTime || 0, 0, trainingCapture.duration);
  }
  if (reviewAudioElement) {
    return clamp(reviewAudioElement.currentTime || 0, 0, trainingCapture.duration);
  }
  return null;
}

async function toggleTrainingReviewPlayback() {
  if (!trainingReviewAvailable() || isPlaying) return;
  if (reviewAnimationFrame) {
    pauseTrainingReviewPlayback();
    return;
  }
  reviewPlaybackStartTime = trainingCapture.reviewTime ?? 0;
  const audioStarted = await startReviewAudioAt(reviewPlaybackStartTime);
  reviewPlaybackStartedAt = performance.now();
  const animateReview = () => {
    const elapsed = (performance.now() - reviewPlaybackStartedAt) / 1000;
    const rawTime = audioStarted ? currentReviewAudioTime() ?? reviewPlaybackStartTime + elapsed : reviewPlaybackStartTime + elapsed;
    const time = snapTrainingReviewTime(rawTime);
    applyTrainingReviewFrame(time);
    redrawTrainingReview();
    updatePlayerTime();
    if (rawTime >= trainingCapture.duration) {
      pauseTrainingReviewPlayback();
      return;
    }
    reviewAnimationFrame = requestAnimationFrame(animateReview);
  };
  reviewAnimationFrame = requestAnimationFrame(animateReview);
  updateReviewPlayButton();
}

function stopReviewAudioSource() {
  if (reviewAudioUsesOriginalElement) {
    if (audioElement) {
      pausedAt = clamp(audioElement.currentTime || 0, 0, getAudioDuration());
      audioElement.pause();
    }
    reviewAudioUsesOriginalElement = false;
  }
  if (reviewAudioElement) {
    reviewAudioElement.pause();
    reviewAudioElement.removeAttribute("src");
    reviewAudioElement.load();
    reviewAudioElement = null;
  }
  if (reviewAudioObjectUrl) {
    URL.revokeObjectURL(reviewAudioObjectUrl);
    reviewAudioObjectUrl = null;
  }
  if (!reviewAudioSource) return;
  try {
    reviewAudioSource.stop();
  } catch (_error) {
    // Already stopped.
  }
  if (reviewAudioSource.reviewGain) {
    reviewAudioSource.reviewGain.disconnect();
  }
  reviewAudioSource.disconnect();
  reviewAudioSource = null;
}

async function startReviewAudioAt(time) {
  stopReviewAudioSource();
  if (inputMode === "file") {
    if (!audioElement?.src) {
      logEvent("review audio missing");
      return false;
    }
    await ensureAudioContext();
    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }
    audioElement.currentTime = clamp(time, 0, getAudioDuration());
    reviewAudioUsesOriginalElement = true;
    try {
      await audioElement.play();
      return true;
    } catch (_error) {
      reviewAudioUsesOriginalElement = false;
      logEvent("review audio missing");
      return false;
    }
  }
  if (!trainingCapture.audioSamples?.length || !trainingCapture.audioSampleRate) {
    logEvent("review audio missing");
    return false;
  }
  if (audioContext?.state === "suspended") {
    await audioContext.resume();
  }
  const offset = clamp(time, 0, Math.max(0, trainingCapture.audioSamples.length / trainingCapture.audioSampleRate - 0.001));
  const wavBlob = audioSamplesToWavBlob(trainingCapture.audioSamples, trainingCapture.audioSampleRate);
  reviewAudioObjectUrl = URL.createObjectURL(wavBlob);
  reviewAudioElement = new Audio(reviewAudioObjectUrl);
  reviewAudioElement.preload = "auto";
  reviewAudioElement.volume = 1;
  reviewAudioElement.onended = () => {
    reviewAudioElement = null;
  };
  await new Promise((resolve) => {
    if (reviewAudioElement.readyState >= 1) {
      resolve();
      return;
    }
    reviewAudioElement.addEventListener("loadedmetadata", resolve, { once: true });
  });
  reviewAudioElement.currentTime = offset;
  await reviewAudioElement.play();
  return true;
}

function audioSamplesToWavBlob(samples, sampleRate) {
  const channelCount = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  samples.forEach((sample) => {
    const value = clamp(Number(sample), -1, 1);
    view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    offset += bytesPerSample;
  });
  return new Blob([view], { type: "audio/wav" });
}

function writeAscii(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function cycleTrainingLight(index, direction = 1) {
  if (!canEditTrainingScene()) return;
  const state = lightStates[index];
  if (!state) return;
  const currentIndex = state.manualColorIndex === null || state.manualColorIndex === undefined
    ? (direction > 0 ? -1 : 0)
    : state.manualColorIndex;
  const nextIndex = (currentIndex + direction + trainingColors.length) % trainingColors.length;
  state.manualColorIndex = nextIndex;
  state.manualRandomColor = null;
  state.intensity = trainingColors[nextIndex].blackout ? 0 : 1;
  if (state.phaseFirstHalf === false && state.phaseSecondHalf === false && !trainingColors[nextIndex].blackout) {
    state.phaseFirstHalf = true;
    state.phaseSecondHalf = true;
  }
  renderLights();
  persistCurrentTrainingFrameScene();
}

function cycleTrainingLightBackward(event) {
  if (!canEditTrainingScene()) return;
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
  if (!canEditTrainingScene()) return;
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
    if (state.phaseFirstHalf === true && state.phaseSecondHalf === false) {
      return;
    }
    if (state.phaseFirstHalf === false && state.phaseSecondHalf === true) {
      state.phaseFirstHalf = true;
      state.phaseSecondHalf = true;
    } else {
      state.phaseFirstHalf = true;
      state.phaseSecondHalf = false;
    }
  } else {
    if (state.phaseFirstHalf === false && state.phaseSecondHalf === true) {
      return;
    }
    if (state.phaseFirstHalf === true && state.phaseSecondHalf === false) {
      state.phaseFirstHalf = true;
      state.phaseSecondHalf = true;
    } else {
      state.phaseFirstHalf = false;
      state.phaseSecondHalf = true;
    }
  }
  state.intensity = state.phaseFirstHalf || state.phaseSecondHalf ? 1 : 0;
  renderLights();
  persistCurrentTrainingFrameScene();
}

function clearTrainingLights() {
  if (!canEditTrainingScene()) return;
  lightStates.forEach((state) => {
    state.manualColorIndex = null;
    state.manualRandomColor = null;
    state.intensity = 0;
    state.age = 999;
    state.phaseFirstHalf = true;
    state.phaseSecondHalf = true;
  });
  renderLights();
  persistCurrentTrainingFrameScene();
}

function saveTrainingAnnotation() {
  if (!canEditTrainingScene()) return;
  const time = currentPlaybackTime();
  const sceneEvent = inputMode === "timeline" ? findTimelineEventAt(time) : null;
  const rhythmEvent = inputMode === "timeline" ? findTimelineRhythmEventAt(time) : null;
  const captureFrame = findTrainingFrameAt(time);
  const finalScene = captureFrame?.final_scene ?? captureFrame?.user_scene ?? null;
  const cue = findTrainingCueAt(time);
  const annotation = {
    id: `mark_${String(trainingAnnotations.length + 1).padStart(3, "0")}`,
    time: roundNumber(time, 4),
    input_mode: inputMode,
    track: loadedTimelineName || loadedFileName || null,
    sound_sample: normalizeSampleTag(elements.sampleTagInput.value),
    cue: cue ? {
      id: cue.id,
      name: cue.name,
      probability: cue.probability,
      rhythm_split: cue.rhythm_split,
    } : null,
    brain: {
      scene: sceneEvent?.scene ?? finalScene?.scene_category ?? captureFrame?.scene_category ?? null,
      sample_category: sceneEvent?.sample_category ?? rhythmEvent?.sample_category ?? finalScene?.sample_category ?? captureFrame?.sample_category ?? null,
      genre_affinity: captureFrame?.genre ?? elements.genreProfile.value,
      intent: sceneEvent?.intent ?? finalScene?.intent ?? captureFrame?.intent ?? null,
      rhythm_gesture: rhythmEvent?.gesture ?? finalScene?.dominant_component ?? captureFrame?.clock_source ?? null,
      metadata: sceneEvent?.metadata ?? null,
    },
    desired_lights: lightStates.map((state, index) => {
      const info = positionInfo(index);
      const color = manualLightColor(state);
      const isBlackout = Boolean(color?.blackout || (state.phaseFirstHalf === false && state.phaseSecondHalf === false));
      const isCasual = color?.name === "casual";
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
        rgb: isCasual ? null : color?.value ?? [0, 0, 0],
        random_palette: isCasual ? casualTrainingColors : null,
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
  const frameText = trainingCapture.frames.length ? `, ${trainingCapture.frames.length} frames` : "";
  const cueText = trainingCapture.cues.length ? `, ${trainingCapture.cues.length} cues` : "";
  const timeText = trainingCapture.active ? `, recording ${formatTime(trainingCapture.duration)}` : "";
  elements.trainingSummary.textContent = `${trainingAnnotations.length} marks${frameText}${cueText}${timeText}`;
}

function findTrainingFrameAt(time) {
  let current = null;
  for (const frame of trainingCapture.frames) {
    if (frame.time > time) break;
    current = frame;
  }
  return current;
}

function findTrainingCueAt(time) {
  let current = null;
  for (const cue of trainingCapture.cues) {
    if (cue.time > time) break;
    current = cue;
  }
  return current;
}

function downloadTrainingAnnotations() {
  const payload = {
    version: 1,
    created_at: new Date().toISOString(),
    track: loadedTimelineName || loadedFileName || null,
    captured_training: {
      source: trainingCapture.source,
      duration: trainingCapture.duration,
      frames: trainingCapture.frames,
      cues: trainingCapture.cues,
    },
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
  pauseTrainingReviewPlayback();
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
    setState("Audio Device ready");
    elements.trackLabel.textContent = "Audio Device";
    elements.playButton.textContent = "Listen";
    elements.playButton.disabled = false;
    elements.stopButton.disabled = true;
    refreshLiveAudioDevices();
  }
  updatePlayerTime();
}

function updateOutputMode() {
  const selected = elements.outputTarget.options[elements.outputTarget.selectedIndex].text;
  elements.outputLabel.textContent = selected;
  document.body.classList.toggle("output-timeline", elements.outputTarget.value === "timeline_json");
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
    updateAudioDeviceSummary("MacBook microphone");
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
  elements.audioDevice.innerHTML = "";
  try {
    const response = await fetch("http://127.0.0.1:8790/devices", { cache: "no-store" });
    if (!response.ok) throw new Error(`live server ${response.status}`);
    const devices = await response.json();
    const visibleDevices = devices.filter(shouldShowLiveDevice);
    const loopbackDevice = visibleDevices.find(isSystemLoopbackDevice);
    const selectableDevices = loopbackDevice
      ? visibleDevices.filter(isSystemLoopbackDevice)
      : [{ index: "default", name: "Default Python input (may be microphone)" }, ...visibleDevices];
    selectableDevices.forEach((device) => {
      const option = document.createElement("option");
      option.value = String(device.index);
      option.textContent = normalizeLiveDeviceName(device.name, device.index);
      elements.audioDevice.appendChild(option);
    });
    if (loopbackDevice) {
      elements.audioDevice.value = String(loopbackDevice.index);
      updateAudioDeviceSummary(normalizeLiveDeviceName(loopbackDevice.name, loopbackDevice.index));
      setState("System audio ready");
      logEvent(`system loopback: ${loopbackDevice.name}`);
    } else {
      updateAudioDeviceSummary("System loopback missing");
      setState("No system loopback");
      logEvent("install/select BlackHole to hear Spotify/Rekordbox");
    }
  } catch (_error) {
    updateAudioDeviceSummary("Python server offline");
    setState("Start audio server");
    logEvent("run: lighting-live-audio");
  }
}

function updateAudioDeviceSummary(value) {
  if (elements.audioDeviceSummary) {
    elements.audioDeviceSummary.value = value;
    elements.audioDeviceSummary.textContent = value;
  }
}

function selectedLiveAudioDevice() {
  const selectedOption = elements.audioDevice.selectedOptions[0];
  if (selectedOption && isSystemLoopbackDevice({ name: selectedOption.textContent })) {
    updateAudioDeviceSummary(selectedOption.textContent);
    return elements.audioDevice.value;
  }
  const loopbackOption = [...elements.audioDevice.options].find((option) => isSystemLoopbackDevice({ name: option.textContent }));
  if (loopbackOption) {
    elements.audioDevice.value = loopbackOption.value;
    updateAudioDeviceSummary(loopbackOption.textContent);
    return loopbackOption.value;
  }
  return elements.audioDevice.value || "default";
}

function shouldShowLiveDevice(device) {
  const name = String(device.name || "").toLowerCase();
  if (name.includes("zoom")) return false;
  if (name.includes("teams")) return false;
  return true;
}

function isSystemLoopbackDevice(device) {
  return /blackhole|loopback|soundflower|vb-cable|audio hijack/i.test(String(device.name || ""));
}

function normalizeLiveDeviceName(name, index) {
  const clean = String(name || "").trim();
  if (!clean) return index === 0 ? "Default Python input" : `Input ${index}`;
  if (isSystemLoopbackDevice({ name: clean })) {
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
  const selectedDevice = selectedLiveAudioDevice();
  const url = `http://127.0.0.1:8790/events?device=${encodeURIComponent(selectedDevice)}`;
  liveEventSource = new EventSource(url);
  isPlaying = true;
  startedAt = audioContext.currentTime;
  pausedAt = 0;
  elements.playButton.textContent = "Pause";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.trackLabel.textContent = "Audio Device";
  setState("Audio Device listening");
  logEvent("audio device live");
  componentHistory = [];
  beginTrainingCapture("python_live_audio");
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
      setState("Audio Device ready");
      elements.trackLabel.textContent = "Audio Device";
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      updateMeter(0);
      updatePlayerTime();
    }
    stopTrainingCapture("stopped");
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
  componentHistory = [];
  beginTrainingCapture("mic_device");
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
    stopTrainingCapture("stopped");
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
  const liveReview = (inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && trainingCapture.frames.length;
  if ((!hasLoadedAudio() || inputMode !== "file") && inputMode !== "timeline" && !liveReview) return;
  const rect = elements.trackOverview.getBoundingClientRect();
  const progress = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  seekToSliderValue(progress * 1000).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

elements.liveSpectrum.addEventListener("click", (event) => {
  if (!trainingReviewAvailable()) return;
  const time = snapTrainingReviewTime(cueTimeFromCanvasEvent(event));
  seekToSliderValue((time / Math.max(trainingCapture.duration, 0.001)) * 1000).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

elements.liveSpectrum.addEventListener("contextmenu", (event) => {
  if (!canEditTrainingScene()) return;
  event.preventDefault();
  toggleTrainingCueAt(cueTimeFromCanvasEvent(event));
});

elements.reviewPlayButton?.addEventListener("click", () => {
  toggleTrainingReviewPlayback().catch((error) => {
    setState("Review audio error");
    logEvent(error.message);
  });
});

window.addEventListener("resize", () => {
  overviewCacheCanvas = null;
  drawTrackOverview();
  redrawTrainingReview();
  updatePlayerTime();
});

elements.outputTarget.addEventListener("change", () => {
  updateOutputMode();
  logEvent(`output ${elements.outputLabel.textContent}`);
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
  if (!isTrainingMode()) {
    stopTrainingCapture("off");
  }
  updateTrainingEditState();
  updatePlayerTime();
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

elements.cueNameInput.addEventListener("input", () => {
  const cue = selectedTrainingCue();
  if (!cue) return;
  cue.name = elements.cueNameInput.value.trim() || cue.id;
  updateTrainingSummary();
  redrawTrainingReview();
});

elements.cueProbabilityInput.addEventListener("input", () => {
  const cue = selectedTrainingCue();
  if (!cue) return;
  cue.probability = roundNumber(clamp(Number(elements.cueProbabilityInput.value), 0, 1), 3);
  elements.cueProbabilityInput.value = String(cue.probability);
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
  if (wasClick && Number.isInteger(index) && canEditTrainingScene()) {
    cycleTrainingLight(index);
  }
}

buildLights(Number(elements.lightCount.value), false);
updateOutputMode();
setInputMode(elements.inputSource.value);
drawTrackOverview();
updateTrainingSummary();
updateTrainingEditState();
