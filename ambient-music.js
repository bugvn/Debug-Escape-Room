// Original browser-generated ambient soundtrack. No audio files or network requests.
const RemediateAmbient = (() => {
  const SETTINGS_KEY = 'remediate.settings.v1';
  const MUTE_KEY = 'remediate.bgmMuted';
  let context = null, master = null, started = false, timer = null, bellIndex = 0;
  let voices = [], noise = null;
  const notes = [220, 246.94, 261.63, 329.63, 293.66, 246.94, 196, 220];

  const getSettings = () => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch (e) { return {}; }
  };

  const isMuted = () => localStorage.getItem(MUTE_KEY) === 'true';

  function setMuted(muted) {
    localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
    update();
  }

  function level() {
    const s = getSettings();
    const masterLevel = typeof s.master === 'number' ? s.master : 100;
    const musicLevel = typeof s.bgm === 'number' ? s.bgm : 80;
    return isMuted() ? 0 : (masterLevel / 100) * (musicLevel / 100) * 0.18;
  }

  function update() {
    if (!master || !context) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(level(), now, 0.12);
  }

  function addPad(frequency, detune, gainValue) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    gain.gain.value = gainValue;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    voices.push({ osc, gain, filter });
  }

  function addNoise() {
    const length = context.sampleRate * 3;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
      data[i] = last * 0.25;
    }
    noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    gain.gain.value = 0.018;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start();
  }

  function playBell() {
    if (!context || isMuted()) return;
    const frequency = notes[bellIndex++ % notes.length];
    const osc = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 4);
  }

  function ensureStarted() {
    if (started) {
      if (context && context.state === 'suspended') context.resume();
      update();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = level();
    master.connect(context.destination);
    addPad(110, -4, 0.22);
    addPad(164.81, 3, 0.14);
    addPad(220, -7, 0.085);
    addNoise();
    started = true;
    timer = setInterval(playBell, 4800);
    playBell();
    updateButtons();
  }

  function updateButtons() {
    const muted = isMuted();
    document.querySelectorAll('[data-remediate-music]').forEach((button) => {
      button.setAttribute('aria-pressed', String(!muted));
      button.classList.toggle('is-muted', muted);
      const label = button.querySelector('[data-music-label]');
      const dot = button.querySelector('[data-music-dot]');
      if (label) label.textContent = muted ? 'MUSIC OFF' : (started ? 'MUSIC ON' : 'MUSIC READY');
      if (dot) {
        dot.style.background = muted ? '#718096' : '#7ae8ff';
        dot.style.boxShadow = muted ? 'none' : '0 0 8px #7ae8ff';
      }
      button.setAttribute('aria-label', muted ? 'Turn cosmic music on' : 'Turn cosmic music off');
    });
  }

  function injectButton() {
    if (document.querySelector('[data-remediate-music]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.remediateMusic = 'true';
    button.setAttribute('aria-label', 'Turn cosmic music off');
    button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9997;display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border:2px solid rgba(122,232,255,.45);background:#071722;color:#bfefff;font:12px VT323,monospace;letter-spacing:.08em;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.5)';
    button.innerHTML = '<span aria-hidden="true" data-music-dot style="width:.55rem;height:.55rem;border-radius:50%;background:#7ae8ff;box-shadow:0 0 8px #7ae8ff"></span><span data-music-label>MUSIC READY</span>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMuted(!isMuted());
      if (!isMuted()) ensureStarted();
    });
    document.body.appendChild(button);
  }

  function wireButton(button) {
    // This button is owned by its page script (for example, login.js).
    button.dataset.remediateMusic = 'true';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const existing = document.getElementById('audio-toggle-btn');
    if (existing) wireButton(existing);
    else injectButton();
    updateButtons();
  });

  ['pointerdown', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      ensureStarted();
      updateButtons();
    }, { once: true });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === SETTINGS_KEY || event.key === MUTE_KEY) {
      update();
      updateButtons();
    }
  });
  document.addEventListener('remediate:settings', update);
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) context.suspend();
    else if (!isMuted()) context.resume();
  });

  return { getMuted: isMuted, setMuted, ensureStarted };
})();
