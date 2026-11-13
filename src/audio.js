// Tiny WebAudio synth: every sound is made in code, no audio files.
import { createPlayer } from './music.js';
import { createAmbience } from './ambience.js';

let ac = null, master = null, sfxBus = null, noiseBuf = null, music = null, amb = null;
// Volumes are 0..1 from the settings sliders (music, ambience, sound effects);
// mute silences everything.
let muted = false, musicVol = 0.7, ambVol = 0.6, sfxVol = 1, rain = false;
const last = new Map();

// The music loop and the ambience run only while wanted, audible and the page
// is visible.
function refreshMusic() {
  const on = !muted && !document.hidden;
  if (music) {
    const want = musicVol > 0 && on;
    if (want && !music.running) music.start();
    else if (!want && music.running) music.stop();
  }
  if (amb) {
    const want = ambVol > 0 && on;
    if (want && !amb.running) { amb.start(); amb.setRain(rain); }
    else if (!want && amb.running) amb.stop();
  }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
  refreshMusic();
}
export const isMuted = () => muted;
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
export function setMusicVolume(v) {
  musicVol = clamp01(v);
  if (music) music.setVolume(musicVol);
  refreshMusic();
}
export function setAmbienceVolume(v) {
  ambVol = clamp01(v);
  if (amb) amb.setVolume(ambVol);
  refreshMusic();
}
export function setSfxVolume(v) {
  sfxVol = clamp01(v);
  if (sfxBus) sfxBus.gain.value = sfxVol;
}
export const volumes = () => ({ music: musicVol, amb: ambVol, sfx: sfxVol });
// Rain on the awning (rainy nights).
export function setRain(on) {
  rain = !!on;
  if (amb) amb.setRain(rain);
}
// A short cheerful flourish at the end of a good level.
export function sting() {
  if (ac && music && musicVol > 0 && !muted) { try { music.sting(); } catch { /* best effort */ } }
}

// Browsers only allow audio after a user gesture; call this from one.
export function unlock() {
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music = createPlayer(ac, master, { volume: musicVol });
    amb = createAmbience(ac, master, { volume: ambVol });
    // Pause everything while the tab is hidden; pick up where it was on return.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ac.suspend(); else ac.resume();
      refreshMusic();
    });
  }
  if (ac.state === 'suspended' && !document.hidden) ac.resume();
  refreshMusic();
}

function env(g, t0, a, d, v) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function tone(f, dur, { type = 'square', vol = 0.15, to = null, at = 0, attack = 0.005 } = {}) {
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  env(g, t0, attack, dur, vol);
  o.connect(g); g.connect(sfxBus);
  o.start(t0); o.stop(t0 + attack + dur + 0.05);
}
function noise(dur, { type = 'bandpass', f = 2000, to = null, q = 1, vol = 0.2, at = 0, attack = 0.005 } = {}) {
  const t0 = ac.currentTime + at;
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf;
  s.playbackRate.value = 0.5 + Math.random();
  fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  env(g, t0, attack, dur, vol);
  s.connect(fl); fl.connect(g); g.connect(sfxBus);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + attack + dur + 0.05);
}

const SOUNDS = {
  tap: () => tone(880, 0.04, { vol: 0.06 }),
  grab: () => { tone(520, 0.05, { vol: 0.08, type: 'triangle' }); tone(780, 0.07, { vol: 0.08, type: 'triangle', at: 0.04 }); },
  clink: () => { tone(1800, 0.08, { vol: 0.06, type: 'sine' }); tone(2400, 0.12, { vol: 0.05, type: 'sine', at: 0.03 }); noise(0.05, { f: 6000, vol: 0.05 }); },
  sizzle: () => noise(0.5, { type: 'highpass', f: 3000, vol: 0.12, attack: 0.02 }),
  crackle: () => noise(0.03, { type: 'highpass', f: 4000 + Math.random() * 3000, vol: 0.04 }),
  bubble: () => tone(300 + Math.random() * 300, 0.05, { type: 'sine', vol: 0.04, to: 600 + Math.random() * 300 }),
  flip: () => { noise(0.08, { f: 1200, to: 3000, vol: 0.12 }); tone(300, 0.06, { type: 'triangle', vol: 0.06, to: 500 }); },
  ready: () => { tone(1320, 0.08, { type: 'triangle', vol: 0.08 }); tone(1760, 0.12, { type: 'triangle', vol: 0.08, at: 0.08 }); },
  burn: () => { tone(140, 0.3, { type: 'sawtooth', vol: 0.08, to: 90 }); noise(0.4, { type: 'lowpass', f: 800, vol: 0.08 }); },
  batter: () => { noise(0.18, { type: 'lowpass', f: 600, to: 200, vol: 0.2 }); tone(200, 0.1, { type: 'sine', vol: 0.08, to: 120 }); },
  fry: () => { noise(0.7, { type: 'highpass', f: 2500, vol: 0.14, attack: 0.01 }); noise(0.3, { type: 'lowpass', f: 400, vol: 0.1 }); },
  sauce: () => { noise(0.15, { type: 'bandpass', f: 800, to: 2500, q: 3, vol: 0.18 }); tone(400, 0.08, { type: 'sine', vol: 0.05, to: 900, at: 0.05 }); },
  trash: () => { tone(400, 0.12, { type: 'triangle', vol: 0.08, to: 150 }); noise(0.1, { f: 900, vol: 0.06 }); },
  nope: () => { tone(220, 0.08, { vol: 0.07 }); tone(180, 0.1, { vol: 0.07, at: 0.08 }); },
  serve: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, { type: 'square', vol: 0.06, at: i * 0.06 })); },
  meh: () => { tone(392, 0.12, { type: 'triangle', vol: 0.08 }); tone(330, 0.2, { type: 'triangle', vol: 0.08, at: 0.12 }); },
  walkout: () => { tone(330, 0.15, { vol: 0.07 }); tone(262, 0.15, { vol: 0.07, at: 0.15 }); tone(196, 0.3, { vol: 0.07, at: 0.3 }); },
  bell: () => { tone(1568, 0.25, { type: 'sine', vol: 0.06 }); tone(2093, 0.35, { type: 'sine', vol: 0.05, at: 0.1 }); },
  swipe: () => noise(0.12, { type: 'bandpass', f: 600, to: 2400, q: 2, vol: 0.1 }),
  // The wok: a whoosh up and a clatter as it lands.
  toss: () => { noise(0.16, { type: 'bandpass', f: 500, to: 2600, q: 1.5, vol: 0.14 }); noise(0.2, { type: 'highpass', f: 3500, vol: 0.08, at: 0.22 }); tone(160, 0.06, { type: 'triangle', vol: 0.06, at: 0.22 }); },
  lift: () => tone(660, 0.05, { type: 'triangle', vol: 0.05, to: 900 }),
  drop: () => tone(500, 0.06, { type: 'triangle', vol: 0.06, to: 300 }),
  page: () => tone(1200, 0.03, { type: 'sine', vol: 0.03 }),
  coin: () => { tone(1976, 0.04, { vol: 0.04 }); tone(2637, 0.08, { vol: 0.04, at: 0.04 }); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.35 : 0.1, { type: 'square', vol: 0.07, at: i * 0.11 })); },
  lose: () => { [392, 370, 349, 330].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.08, at: i * 0.18 })); },
  star: () => { tone(1047, 0.06, { vol: 0.07 }); tone(1568, 0.15, { vol: 0.07, at: 0.06 }); },
};

// Frequent ambient cooking sounds don't duck the music (it would pump).
const QUIET = new Set(['crackle', 'bubble', 'tap', 'coin', 'lift', 'page']);

// Plays a named sound, at most once per `gap` seconds per name.
export function play(name, gap = 0.03) {
  if (!ac || muted || sfxVol <= 0 || !SOUNDS[name]) return;
  const now = ac.currentTime;
  if (now - (last.get(name) ?? -1) < gap) return;
  last.set(name, now);
  if (music && !QUIET.has(name)) music.duck();
  try { SOUNDS[name](); } catch { /* audio is best effort */ }
}
export const SOUND_NAMES = Object.keys(SOUNDS);
