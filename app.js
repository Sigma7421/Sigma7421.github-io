const drillPacks = {
  fundamentals: [
    { cue: "Jab", short: "Jab", number: "One", hits: 1 },
    { cue: "Jab, cross", short: "One two", number: "One two", hits: 2 },
    { cue: "Double jab, cross", short: "Double jab cross", number: "One one two", hits: 3 },
    { cue: "Jab, cross, left hook", short: "One two hook", number: "One two three", hits: 3 },
    { cue: "Cross, left hook, cross", short: "Two hook two", number: "Two three two", hits: 3 },
    { cue: "Jab, body cross, left hook", short: "Jab body hook", number: "One body three", hits: 3 }
  ],
  defense: [
    { cue: "Jab, cross, slip right, cross", short: "One two slip two", number: "One two slip two", hits: 3 },
    { cue: "Jab, cross, roll, left hook", short: "One two roll hook", number: "One two roll three", hits: 3 },
    { cue: "Cross, left hook, pivot", short: "Two hook pivot", number: "Two three pivot", hits: 2 },
    { cue: "Jab, step out, cross", short: "Jab out cross", number: "One out two", hits: 2 },
    { cue: "Jab, cross, jab, move", short: "One two one move", number: "One two one move", hits: 3 },
    { cue: "Left hook, roll, right uppercut", short: "Hook roll uppercut", number: "Three roll six", hits: 2 }
  ],
  conditioning: [
    { cue: "Four straight punches", short: "Four straights", number: "One two one two", hits: 4 },
    { cue: "Six fast punches", short: "Six fast", number: "One two one two one two", hits: 6 },
    { cue: "Jab, cross, hook, cross", short: "One two hook two", number: "One two three two", hits: 4 },
    { cue: "Ten seconds power shots", short: "Power shots", number: "Power shots", hits: 8 },
    { cue: "Body, body, head", short: "Body body head", number: "Body body head", hits: 3 },
    { cue: "Fast jab finish", short: "Fast jabs", number: "Jabs", hits: 5 }
  ]
};

const paceConfig = {
  easy: { gap: 5500, delay: 1150, cooldown: 210 },
  sharp: { gap: 4000, delay: 760, cooldown: 180 },
  hard: { gap: 2800, delay: 470, cooldown: 150 }
};

const motivationLines = [
  "Stay on it.",
  "Hands back, chin down.",
  "Breathe, then fire.",
  "Win the next exchange.",
  "Make the bag answer.",
  "Small steps, sharp shots.",
  "Reset and go again.",
  "Keep working.",
  "One clean combo at a time.",
  "Finish strong."
];

const state = {
  running: false,
  paused: false,
  inRest: false,
  cue: null,
  expectedHits: 0,
  comboHits: 0,
  comboCount: 0,
  punchCount: 0,
  lastHitAt: 0,
  longestGap: 0,
  roundStartedAt: 0,
  remainingMs: 180000,
  timerId: null,
  availableVoices: [],
  audio: null,
  analyser: null,
  data: null,
  raf: null,
  threshold: 0.22,
  lastCueIndex: -1
};

const els = {
  startBtn: document.querySelector("#startBtn"),
  pauseBtn: document.querySelector("#pauseBtn"),
  calibrateBtn: document.querySelector("#calibrateBtn"),
  simulateBtn: document.querySelector("#simulateBtn"),
  threshold: document.querySelector("#threshold"),
  roundLength: document.querySelector("#roundLength"),
  restLength: document.querySelector("#restLength"),
  pace: document.querySelector("#pace"),
  voiceMode: document.querySelector("#voiceMode"),
  coachStyle: document.querySelector("#coachStyle"),
  currentCue: document.querySelector("#currentCue"),
  hitDots: document.querySelector("#hitDots"),
  hitCount: document.querySelector("#hitCount"),
  levelMeter: document.querySelector("#levelMeter"),
  clock: document.querySelector("#clock"),
  phaseLabel: document.querySelector("#phaseLabel"),
  callLog: document.querySelector("#callLog"),
  statPunches: document.querySelector("#statPunches"),
  statCombos: document.querySelector("#statCombos"),
  statPace: document.querySelector("#statPace"),
  statGap: document.querySelector("#statGap")
};

els.startBtn.addEventListener("click", () => {
  if (state.running) {
    stopRound();
    return;
  }
  startRound();
});

els.pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  els.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  speak(state.paused ? "Paused" : "Resume");
});

els.calibrateBtn.addEventListener("click", calibrateMic);
els.simulateBtn.addEventListener("click", () => recordHit(true));
els.threshold.addEventListener("input", () => {
  state.threshold = Number(els.threshold.value);
});

if ("speechSynthesis" in window) {
  state.availableVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    state.availableVoices = window.speechSynthesis.getVoices();
  });
}

function selectedPack() {
  return document.querySelector("input[name='pack']:checked").value;
}

async function startRound() {
  await ensureMic();
  window.clearInterval(state.timerId);
  resetStats();
  state.running = true;
  state.paused = false;
  state.inRest = false;
  state.roundStartedAt = performance.now();
  state.remainingMs = Number(els.roundLength.value) * 1000;
  state.lastHitAt = 0;
  els.startBtn.textContent = "Stop";
  els.pauseBtn.disabled = false;
  els.phaseLabel.textContent = "Round";
  updateClock();
  speak("Round starts");
  nextCue(700);
  state.timerId = window.setInterval(tick, 250);
}

function stopRound() {
  state.running = false;
  state.paused = false;
  state.inRest = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  els.startBtn.textContent = "Start round";
  els.pauseBtn.textContent = "Pause";
  els.pauseBtn.disabled = true;
  els.phaseLabel.textContent = "Ready";
  els.currentCue.textContent = "Choose a drill and start";
  renderHitProgress(0, 0);
  speak("Round stopped");
}

function finishRound() {
  state.running = false;
  state.inRest = true;
  window.clearInterval(state.timerId);
  state.remainingMs = Number(els.restLength.value) * 1000;
  els.phaseLabel.textContent = "Rest";
  els.currentCue.textContent = "Rest";
  renderHitProgress(0, 0);
  speak(`Round complete. ${state.punchCount} punches.`);
  state.timerId = window.setInterval(restTick, 250);
}

function restTick() {
  state.remainingMs -= 250;
  updateClock();
  if (state.remainingMs <= 0) {
    window.clearInterval(state.timerId);
    state.timerId = null;
    state.inRest = false;
    els.phaseLabel.textContent = "Ready";
    els.currentCue.textContent = "Ready for the next round";
    els.startBtn.textContent = "Start round";
    els.pauseBtn.disabled = true;
    speak("Rest complete");
  }
}

function tick() {
  if (state.paused) return;
  state.remainingMs -= 250;
  updateClock();
  if (state.remainingMs <= 0) {
    finishRound();
    return;
  }

  const gapLimit = paceConfig[els.pace.value].gap;
  const waitingTooLong = state.cue && state.comboHits === 0 && performance.now() - state.cue.calledAt > gapLimit;
  if (waitingTooLong) {
    speak(formatCue(state.cue));
    state.cue.calledAt = performance.now();
  }
}

function nextCue(delay = paceConfig[els.pace.value].delay) {
  if (!state.running || state.paused) return;
  window.setTimeout(() => {
    if (!state.running || state.paused) return;
    const pack = drillPacks[selectedPack()];
    let index = Math.floor(Math.random() * pack.length);
    if (pack.length > 1 && index === state.lastCueIndex) {
      index = (index + 1) % pack.length;
    }
    state.lastCueIndex = index;
    state.cue = { ...pack[index], calledAt: performance.now() };
    state.expectedHits = state.cue.hits;
    state.comboHits = 0;
    els.currentCue.textContent = state.cue.cue;
    renderHitProgress(0, state.expectedHits);
    logCue(state.cue.cue);
    speak(formatCue(state.cue));
  }, delay);
}

function formatCue(cue) {
  if (els.voiceMode.value === "numbers") return cue.number;
  if (els.voiceMode.value === "short") return cue.short;
  return cue.cue;
}

function recordHit(fromButton = false) {
  if (!state.running || state.paused || state.inRest || !state.cue) return;
  const now = performance.now();
  const cooldown = paceConfig[els.pace.value].cooldown;
  if (!fromButton && now - state.lastHitAt < cooldown) return;

  if (state.lastHitAt) {
    state.longestGap = Math.max(state.longestGap, (now - state.lastHitAt) / 1000);
  }
  state.lastHitAt = now;
  state.punchCount += 1;
  state.comboHits = Math.min(state.comboHits + 1, state.expectedHits);
  renderHitProgress(state.comboHits, state.expectedHits);
  updateStats();

  if (state.comboHits >= state.expectedHits) {
    state.comboCount += 1;
    updateStats();
    state.cue = null;
    maybeMotivate();
    nextCue();
  }
}

async function ensureMic() {
  if (state.analyser) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    els.currentCue.textContent = "Mic unavailable. Use Simulate hit.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audio = new AudioContext();
    const source = state.audio.createMediaStreamSource(stream);
    state.analyser = state.audio.createAnalyser();
    state.analyser.fftSize = 1024;
    state.data = new Uint8Array(state.analyser.fftSize);
    source.connect(state.analyser);
    listen();
  } catch (error) {
    els.currentCue.textContent = "Mic blocked. Use Simulate hit.";
    console.warn(error);
  }
}

function listen() {
  if (!state.analyser) return;
  state.analyser.getByteTimeDomainData(state.data);
  let sum = 0;
  let peak = 0;
  for (const sample of state.data) {
    const centered = Math.abs(sample - 128) / 128;
    sum += centered * centered;
    peak = Math.max(peak, centered);
  }
  const rms = Math.sqrt(sum / state.data.length);
  const level = Math.max(rms, peak * 0.58);
  els.levelMeter.value = Math.min(1, level);
  if (level > state.threshold) recordHit();
  state.raf = requestAnimationFrame(listen);
}

async function calibrateMic() {
  await ensureMic();
  const samples = [];
  const started = performance.now();
  els.currentCue.textContent = "Stay quiet for calibration";
  speak("Calibrating");

  function collect() {
    if (!state.analyser) return;
    state.analyser.getByteTimeDomainData(state.data);
    let sum = 0;
    for (const sample of state.data) {
      const centered = Math.abs(sample - 128) / 128;
      sum += centered * centered;
    }
    samples.push(Math.sqrt(sum / state.data.length));
    if (performance.now() - started < 1800) {
      requestAnimationFrame(collect);
      return;
    }
    const average = samples.reduce((total, value) => total + value, 0) / samples.length;
    state.threshold = Math.min(0.65, Math.max(0.08, average * 7));
    els.threshold.value = state.threshold.toFixed(2);
    els.currentCue.textContent = "Calibration set";
    speak("Calibration set");
  }

  collect();
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const gritty = els.coachStyle.value === "corner";
  utterance.rate = gritty ? 0.96 : 1.08;
  utterance.pitch = gritty ? 0.68 : 0.88;
  const voice = pickVoice(gritty);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function maybeMotivate() {
  if (els.coachStyle.value !== "corner") return;
  if (state.comboCount % 3 !== 0) return;
  const line = motivationLines[Math.floor(Math.random() * motivationLines.length)];
  window.setTimeout(() => speak(line), 140);
}

function pickVoice(gritty) {
  if (!state.availableVoices.length) return null;
  if (!gritty) {
    return state.availableVoices.find((voice) => voice.default) || state.availableVoices[0];
  }
  return state.availableVoices.find((voice) => {
    const name = voice.name.toLowerCase();
    return voice.lang.startsWith("en") && (name.includes("male") || name.includes("david") || name.includes("mark"));
  }) || state.availableVoices.find((voice) => voice.lang.startsWith("en")) || state.availableVoices[0];
}

function renderHitProgress(done, total) {
  els.hitDots.innerHTML = "";
  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement("span");
    dot.className = `dot${index < done ? " done" : ""}`;
    els.hitDots.append(dot);
  }
  els.hitCount.textContent = `${done} / ${total}`;
}

function updateClock() {
  const totalSeconds = Math.max(0, Math.ceil(state.remainingMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  els.clock.textContent = `${minutes}:${seconds}`;
}

function resetStats() {
  state.comboCount = 0;
  state.punchCount = 0;
  state.longestGap = 0;
  state.lastCueIndex = -1;
  state.cue = null;
  els.callLog.innerHTML = "";
  updateStats();
}

function updateStats() {
  const elapsedMinutes = Math.max(0.01, (performance.now() - state.roundStartedAt) / 60000);
  els.statPunches.textContent = state.punchCount;
  els.statCombos.textContent = state.comboCount;
  els.statPace.textContent = `${Math.round(state.punchCount / elapsedMinutes)}/min`;
  els.statGap.textContent = `${state.longestGap.toFixed(1)}s`;
}

function logCue(cue) {
  const item = document.createElement("li");
  item.innerHTML = `<strong>${cue}</strong>`;
  els.callLog.prepend(item);
  while (els.callLog.children.length > 12) {
    els.callLog.lastElementChild.remove();
  }
}

updateClock();
renderHitProgress(0, 0);
