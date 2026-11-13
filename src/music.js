// Background music, synthesized in code: an original loop for an evening street
// market. D major pentatonic, 100 BPM, 16 bars (38.4 s) in four sections:
//   A  (D Bm G A)     plucked-string tune, bells on beat 3, light hand drum
//   B  (G A F#m Bm)   busier tune, bells on the offbeats, woodblock and shaker
//   A' (D Bm G A)     the tune an octave up, answered by the drum
//   C  (Em G A D)     breather: bells lead, sparse plucks, soft drum
// Voices: a gayageum-like pluck (bright attack, fast filter decay, a small
// pull into the note and a bend on long notes), a two-partial bell, a soft
// triangle bass, a quiet pad, a janggu-like hand drum, woodblock and shaker.
// The crowd murmur and other market sounds are in ambience.js (their own
// volume). Works with an AudioContext or an OfflineAudioContext
// (tools/render-music.js renders a WAV with it).

export const BPM = 100;
export const STEP = 60 / BPM / 4; // a 16th note
const BAR_STEPS = 16;

// Pentatonic notes by symbol. a b = A3 B3; 0-9 = D4 E4 F#4 A4 B4 D5 E5 F#5 A5 B5.
const NOTE = { a: 57, b: 59, 0: 62, 1: 64, 2: 66, 3: 69, 4: 71, 5: 74, 6: 76, 7: 78, 8: 81, 9: 83 };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Chords as MIDI notes: root (bass) then the pad voicing.
const CH = {
  D: [38, 62, 66, 69], Bm: [35, 62, 66, 71], G: [43, 62, 67, 71], A: [45, 61, 64, 69],
  Fsm: [42, 61, 66, 69], Em: [40, 59, 64, 67],
};

// Each tune bar is 8 eighth notes: a note symbol, '-' holds it, '.' is a rest.
const SECTIONS = [
  { name: 'A', chords: ['D', 'Bm', 'G', 'A'], tune: ['5-3-2.3.', '4.5.7---', '6-5-4-3.', '2-3-1---'],
    bells: [4], drum: 'A' },
  { name: 'B', chords: ['G', 'A', 'Fsm', 'Bm'], tune: ['3.4.5.43', '6-5-6.8.', '7-5-2-3.', '4-----57'],
    bells: [1, 3, 5, 7], drum: 'B' },
  { name: "A'", chords: ['D', 'Bm', 'G', 'A'], tune: ['8-7-5.7.', '9.8.7---', '6-8-9-8.', '7-6-5---'],
    bells: [4, 6], drum: 'A2' },
  { name: 'C', chords: ['Em', 'G', 'A', 'D'], tune: ['....6-5-', '4-------', '....3-2-', '5-------'],
    bells: [0, 2, 3, 5, 6], drum: 'C' },
];
export const LOOP_BARS = SECTIONS.length * 4;
export const LOOP_STEPS = LOOP_BARS * BAR_STEPS;
export const LOOP_SECONDS = LOOP_STEPS * STEP;

// Hand-drum patterns over 16 steps: D = low "dum", k = slap, w = woodblock, s = shaker.
const DRUMS = {
  A: ['D.....D...k.....', 'D.....D...k...k.'],
  B: ['D.s.k.D.s.k.D.w.', 'D.s.k.Dws.k.w.s.'],
  A2: ['D.....D...k.w...', 'D.....D.D.k.k.w.'],
  C: ['D...........k...', 'D.......D.......'],
};

// Bar n of the loop -> what plays in it (pure; used by tests).
export function barAt(n) {
  const b = ((n % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
  const sec = SECTIONS[Math.floor(b / 4)];
  const i = b % 4;
  return { section: sec.name, chord: sec.chords[i], tune: sec.tune[i], bells: sec.bells,
    drum: DRUMS[sec.drum][i % 2], last: i === 3 };
}
// Notes of a tune bar as { at (eighths), len (eighths), midi }.
export function tuneNotes(bar) {
  const out = [];
  for (let i = 0; i < bar.length; i++) {
    const c = bar[i];
    if (c === '.' || c === '-') continue;
    let len = 1;
    while (bar[i + len] === '-') len++;
    out.push({ at: i, len, midi: NOTE[c] });
  }
  return out;
}

export function createMusic(ac, dest) {
  const bus = ac.createGain();
  bus.gain.value = 1;
  bus.connect(dest);
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const gainAt = (t, peak, a, dec) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    g.connect(bus);
    return g;
  };

  // Gayageum-like pluck: one sawtooth through a resonant low-pass that closes fast.
  function pluck(t, midi, beats, vel = 0.1) {
    const f = hz(midi), len = beats * STEP * 2;
    const o = ac.createOscillator(), fl = ac.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04); // pulled into the note
    if (beats >= 3) { // long note: a gentle press-bend and back, like nonghyeon
      o.frequency.setValueAtTime(f, t + 0.22);
      o.frequency.linearRampToValueAtTime(f * 1.03, t + 0.36);
      o.frequency.linearRampToValueAtTime(f, t + 0.55);
    }
    fl.type = 'lowpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(Math.min(5200, f * 9), t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.6), t + 0.28);
    const dec = Math.min(1.5, len + 0.35);
    o.connect(fl); fl.connect(gainAt(t, vel, 0.004, dec));
    o.start(t); o.stop(t + dec + 0.05);
  }
  // Soft mallet bell: a sine plus a quieter inharmonic partial.
  function bell(t, midi, vel = 0.035) {
    const f = hz(midi);
    [[1, 1, 1.1], [2.76, 0.35, 0.35]].forEach(([r, v, dec]) => {
      const o = ac.createOscillator();
      o.type = 'sine'; o.frequency.value = f * r;
      o.connect(gainAt(t, vel * v, 0.003, dec));
      o.start(t); o.stop(t + dec + 0.05);
    });
  }
  function bass(t, midi, secs, vel = 0.09) {
    const o = ac.createOscillator();
    o.type = 'triangle'; o.frequency.value = hz(midi);
    o.connect(gainAt(t, vel, 0.02, secs));
    o.start(t); o.stop(t + secs + 0.1);
  }
  function pad(t, notes, secs) {
    for (const m of notes) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = (Math.random() - 0.5) * 8;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.012, t + secs * 0.35);
      g.gain.linearRampToValueAtTime(0, t + secs + 0.15);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + secs + 0.2);
    }
  }
  function hit(t, kind) {
    if (kind === 'D') { // janggu "dum": a dropping low sine
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.15);
      o.connect(gainAt(t, 0.16, 0.003, 0.28));
      o.start(t); o.stop(t + 0.35);
    } else if (kind === 'w') { // woodblock
      const o = ac.createOscillator();
      o.type = 'triangle'; o.frequency.value = 980;
      o.connect(gainAt(t, 0.05, 0.001, 0.06));
      o.start(t); o.stop(t + 0.1);
    } else { // k = skin slap, s = shaker: filtered noise
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter();
      s.buffer = noise;
      fl.type = kind === 'k' ? 'bandpass' : 'highpass';
      fl.frequency.value = kind === 'k' ? 2200 : 6500; fl.Q.value = 1.2;
      const dec = kind === 'k' ? 0.07 : 0.04;
      s.connect(fl); fl.connect(gainAt(t, kind === 'k' ? 0.07 : 0.025, 0.002, dec));
      s.start(t, Math.random() * 0.8); s.stop(t + dec + 0.05);
    }
  }

  // Everything that starts on one 16th-note step of the loop.
  function scheduleStep(step, t) {
    const barN = Math.floor(step / BAR_STEPS), s = step % BAR_STEPS;
    const bar = barAt(barN), ch = CH[bar.chord];
    if (s === 0) {
      pad(t, ch.slice(1), BAR_STEPS * STEP);
      bass(t, ch[0], STEP * 5);
    }
    if (s === 6) bass(t, ch[0] + 7, STEP * 3, 0.06);
    if (s === 10) bass(t, ch[0], STEP * 5, 0.07);
    if (s % 2 === 0) {
      const e = s / 2;
      for (const n of tuneNotes(bar.tune)) if (n.at === e) pluck(t, n.midi, n.len);
      if (bar.bells.includes(e)) {
        const tones = ch.slice(1).map((m) => m + 12);
        bell(t, tones[(barN + bar.bells.indexOf(e)) % tones.length]);
      }
    }
    const k = bar.drum[s];
    if (k && k !== '.') hit(t, k);
  }

  return {
    bus,
    scheduleStep,
    // A short cheerful flourish for the end of a level.
    sting(t) {
      [62, 64, 66, 69, 71, 74].forEach((m, i) => pluck(t + i * 0.09, m, i === 5 ? 4 : 1, 0.11));
      bell(t + 0.45, 86, 0.05); bell(t + 0.54, 90, 0.04);
      hit(t, 'D'); hit(t + 0.45, 'D');
    },
  };
}

// Real-time player: a lookahead scheduler (a coarse setTimeout loop that queues
// notes slightly ahead on the audio clock), so timing stays tight and cheap.
export function createPlayer(ac, dest, { volume = 0.7 } = {}) {
  const out = ac.createGain();
  out.gain.value = 0;
  out.connect(dest);
  const m = createMusic(ac, out);
  const LOOKAHEAD = 0.25, TICK_MS = 60;
  let step = 0, nextT = 0, timer = null, running = false, duckUntil = 0, stingM = null;

  function tick() {
    if (!running) return;
    const now = ac.currentTime;
    if (nextT < now) nextT = now + 0.05; // fell behind (tab was throttled): skip ahead
    while (nextT < now + LOOKAHEAD) {
      try { m.scheduleStep(step, nextT); } catch { /* best effort */ }
      step = (step + 1) % LOOP_STEPS;
      nextT += STEP;
    }
    timer = setTimeout(tick, TICK_MS);
  }
  return {
    get running() { return running; },
    start() {
      if (running) return;
      running = true;
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(volume, t + 1.5);
      nextT = t + 0.1;
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
    },
    // Live volume change from the settings slider.
    setVolume(v) {
      volume = v;
      if (stingM) stingM.bus.gain.value = v;
      if (!running) return;
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(volume, t, 0.03);
    },
    // Dip under a sound effect, then come back.
    duck(amount = 0.55, secs = 0.35) {
      if (!running) return;
      const t = ac.currentTime;
      if (t < duckUntil - 0.05) return;
      duckUntil = t + secs;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(volume * amount, t, 0.02);
      out.gain.setTargetAtTime(volume, t + secs * 0.5, secs * 0.4);
    },
    sting() {
      const t = ac.currentTime;
      if (running) {
        out.gain.cancelScheduledValues(t);
        out.gain.setTargetAtTime(volume * 0.25, t, 0.05);
        out.gain.setTargetAtTime(volume, t + 2.2, 0.5);
      }
      // Its own voices, not under the ducked loop; starts after the win jingle.
      if (!stingM) { stingM = createMusic(ac, dest); stingM.bus.gain.value = volume; }
      stingM.sting(t + 0.75);
    },
  };
}
