// Ambience: the sound of the market around the stall, synthesized in code and
// separate from the music so each has its own volume slider. Layers:
//   crowd   a faint murmur (looped noise through a soft band-pass, slow swell)
//   wind    low filtered noise that rises and falls
//   sizzle  far-off stalls cooking: high noise in slow random swells
//   chimes  a wind chime now and then (two or three soft pentatonic bells)
//   rain    only on rainy nights (level 4): a steady patter
// Works with an AudioContext or an OfflineAudioContext.

// Chime notes: D major pentatonic, high (D6 E6 F#6 A6 B6 D7).
export const CHIME_NOTES = [86, 88, 90, 93, 95, 98];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// One wind chime: 2-3 notes from the scale, a little apart. `r` is a 0..1 random.
export function chimeAt(r) {
  const n = 2 + Math.floor(r() * 2);
  const out = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    out.push({ at, midi: CHIME_NOTES[Math.floor(r() * CHIME_NOTES.length)], vel: 0.012 + r() * 0.01 });
    at += 0.12 + r() * 0.25;
  }
  return out;
}
// Seconds until the next chime.
export const chimeGap = (r) => 4 + r() * 7;

export function createAmbience(ac, dest, { volume = 0.6, random = Math.random } = {}) {
  const out = ac.createGain();
  out.gain.value = 0;
  out.connect(dest);
  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = random() * 2 - 1;

  let layers = [], rainGain = null, rain = false, running = false, timer = null, nextChime = 0;

  // A looped noise layer through a filter, its level swayed by a slow LFO.
  function bed(t, { type, f, q = 0.8, level, sway, rate }) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain();
    s.buffer = noise; s.loop = true;
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.value = level;
    lfo.frequency.value = rate; lg.gain.value = sway;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, random()); lfo.start(t);
    layers.push(s, lfo);
    return g;
  }
  function chime(t) {
    for (const c of chimeAt(random)) {
      for (const [mul, v] of [[1, 1], [2.76, 0.35]]) { // a bell: the note and a bright partial
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = hz(c.midi) * mul;
        const t0 = t + c.at;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(c.vel * v, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + (mul === 1 ? 2.2 : 0.8));
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + 2.3);
      }
    }
  }
  function tick() {
    if (!running) return;
    const now = ac.currentTime;
    if (now >= nextChime - 0.3) {
      chime(Math.max(now + 0.05, nextChime));
      nextChime = Math.max(now, nextChime) + chimeGap(random);
    }
    timer = setTimeout(tick, 250);
  }

  return {
    get running() { return running; },
    start() {
      if (running) return;
      running = true;
      const t = ac.currentTime;
      layers = [];
      bed(t, { type: 'bandpass', f: 650, level: 0.012, sway: 0.005, rate: 0.11 }); // crowd
      bed(t, { type: 'lowpass', f: 380, q: 0.5, level: 0.02, sway: 0.014, rate: 0.07 }); // wind
      bed(t, { type: 'highpass', f: 5200, q: 0.7, level: 0.003, sway: 0.0025, rate: 0.23 }); // far sizzle
      rainGain = bed(t, { type: 'bandpass', f: 2600, q: 0.6, level: 0, sway: 0, rate: 0.5 }); // rain
      rainGain.gain.value = rain ? 0.02 : 0;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(volume, t + 1.5);
      nextChime = t + 1.5 + random() * 3;
      tick();
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(timer);
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.3);
      for (const s of layers) { try { s.stop(t + 0.35); } catch { /* already stopped */ } }
      layers = []; rainGain = null;
    },
    setVolume(v) {
      volume = v;
      if (!running) return;
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(volume, t, 0.03);
    },
    // Rain on the awning (rainy nights only).
    setRain(on) {
      rain = !!on;
      if (rainGain) rainGain.gain.setTargetAtTime(rain ? 0.02 : 0, ac.currentTime, 0.4);
    },
    chime,
  };
}
