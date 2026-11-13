// The story: a short scene at the counter before each level, plus the dialogue
// state machine and the story save (pure; no DOM). The same script is written
// out for reading in STORY.md.
//
// A scene is a list of steps:
//   { who, text }                       a line ('YOU', 'STORY' or a spirit id)
//   { who, text, if: flag }             only when the flag is set (unless: not set)
//   { choice: [{ text, reply: [steps], effect: { rel: n, flag } }] }
// Choices never block: every option leads on, and Skip is always there.
import { SPIRITS, memoryText } from './spirits.js';

export const SCENES = [
  {
    id: 'l1', level: 1, spirit: 'lantern', title: 'The first light',
    steps: [
      { who: 'STORY', text: 'Grandma left you her stall. Dust on the counter. Chimaek will not stop staring at the empty street.' },
      { who: 'STORY', text: 'Then the lanterns flicker, one by one, and the street is not empty anymore.' },
      { who: 'lantern', text: 'Mmm... the light is on. I thought I was dreaming.' },
      { who: 'lantern', text: 'You have her eyes. The old cook. Is she...?' },
      {
        choice: [
          { text: 'She passed in the spring.', effect: { rel: 1, flag: 'deung_told' },
            reply: [{ who: 'lantern', text: 'Ah. Then the light is yours to keep now. She promised it would never go out.' }] },
          { text: 'Who are you?', effect: { rel: 0 },
            reply: [{ who: 'lantern', text: 'Just a lantern who stays up too late. She kept a light on for me. Every night.' }] },
          { text: 'We are open! What can I get you?', effect: { rel: 1, flag: 'deung_business' },
            reply: [{ who: 'lantern', text: 'Ha! Straight to business. Just like her.' }] },
        ],
      },
      { who: 'lantern', text: 'Something cold and fizzy, please. From the cooler.' },
      { who: 'lantern', text: 'My friends saw the light too. They will be hungry.' },
    ],
  },
  {
    id: 'l2', level: 2, spirit: 'fox', title: 'The slipping mask',
    steps: [
      { who: 'STORY', text: 'A fox in a white mask leans on the counter. The mask keeps slipping.' },
      { who: 'fox', text: 'So. The grill is warm again. Do you know how she grilled galbi?' },
      { who: 'fox', text: 'One side, then flip, then the other. Never in a hurry.' },
      {
        choice: [
          { text: 'Can I see your face?', effect: { rel: -1, flag: 'yeo_asked' },
            reply: [{ who: 'fox', text: 'She promised never to ask. Breaking her promises already?' }] },
          { text: 'One side, then the other. Got it.', effect: { rel: 1, flag: 'yeo_hum' },
            reply: [{ who: 'fox', text: 'Good. She hummed while she flipped. I liked the humming.' }] },
        ],
      },
      { who: 'fox', text: 'Your dog does not like me. That is fair. I used to steal her sausages.' },
      { who: 'STORY', text: 'Chimaek growls. Very softly.' },
    ],
  },
  {
    id: 'l3', level: 3, spirit: 'moss', title: 'Old coins',
    steps: [
      { who: 'STORY', text: 'Something big and green shuffles up. Mossy stones, and a small white flower on top.' },
      { who: 'moss', text: '...Hello. ...I am slow. ...Sorry.' },
      { who: 'moss', text: '...She saved me the first drumstick. ...Every batch. ...Batter, then oil, then gold.' },
      {
        choice: [
          { text: 'The first one is yours. Promise.', effect: { rel: 1, flag: 'ikki_promise' },
            reply: [{ who: 'moss', text: '...Thank you. ...I will pay. ...I always pay.' }] },
          { text: 'Can you pay for it?', effect: { rel: 0, flag: 'ikki_coins' },
            reply: [{ who: 'STORY', text: 'Old coins rattle out of the moss.' }, { who: 'moss', text: '...These were good when she was young. ...Still good?' }] },
        ],
      },
      { who: 'moss', text: '...Your dog keeps looking under the counter. ...She is guarding something.' },
      { who: 'moss', text: '...Good dog.' },
    ],
  },
  {
    id: 'l4', level: 4, spirit: 'frog', title: 'The wok song',
    steps: [
      { who: 'STORY', text: 'Rain on the awning. A round blue frog with a paper boat on its head hops onto the counter.' },
      { who: 'frog', text: 'Ribbit! The wok! You found the wok! She promised to teach me the wok song.' },
      { who: 'frog', text: 'Toss... and land. Toss... and land. Too fast and it all goes on the floor!' },
      {
        choice: [
          { text: 'Then you teach me.', effect: { rel: 1, flag: 'frog_teacher' },
            reply: [{ who: 'frog', text: 'Me? Teach? Oh! Oh, I will try! Flick up... and wait for it to land!' }] },
          { text: 'Why the paper boat?', effect: { rel: 0, flag: 'frog_river' },
            reply: [{ who: 'frog', text: 'For the rain! She folded it the winter the river froze. The winter her hands got too cold to cook.' }] },
        ],
      },
      { who: 'frog', text: 'And if you stop tossing, it burns. She never stopped. Not once.' },
      { who: 'STORY', text: 'Chimaek has hidden behind the counter. Only her ears show.' },
    ],
  },
  {
    id: 'l5', level: 5, spirit: 'moth', title: 'A letter, unsent',
    steps: [
      { who: 'STORY', text: 'A soft grey moth lands on the cooler. A postbag hangs from one wing.' },
      { who: 'moth', text: 'Post! Well. Almost post. This letter is thirty years late and a little chewed.' },
      { who: 'moth', text: 'She wrote it, but never said where to take it. Only: give it to whoever comes back.' },
      {
        choice: [
          { text: 'Read it to me.', effect: { rel: 1, flag: 'letter_read' },
            reply: [
              { who: 'moth', text: 'Ahem. Buy a fourth grill spot. The tray is too small. Feed the fox less.' },
              { who: 'moth', text: 'The last line is smudged. Something about a bell.' },
            ] },
          { text: 'Keep it for now.', effect: { rel: 1, flag: 'letter_kept' },
            reply: [{ who: 'moth', text: 'A patient one! Some letters wait for the right night.' }] },
        ],
      },
      { who: 'moth', text: 'Tonight everyone wants everything. Start the slow food first!' },
      { who: 'STORY', text: 'After closing, you can spend your coins on the stall.' },
    ],
  },
  {
    id: 'l6', level: 6, spirit: 'crane', title: 'The long line',
    steps: [
      { who: 'STORY', text: 'A paper crane unfolds itself on the counter. There is writing on its wings. Grandma wrote it.' },
      { who: 'crane', text: 'I was a recipe once. Her last page. Steamed buns. She never finished it.' },
      { who: 'crane', text: 'Do you see them? The line. Everyone heard the stall is open.' },
      {
        choice: [
          { text: 'Why did she close the stall?', effect: { rel: 1, flag: 'bell_known' },
            reply: [
              { who: 'crane', text: 'Her hands got too cold for the wok, and she could not ring the bell anymore.' },
              { who: 'crane', text: 'So she asked the dog to keep it safe. Until someone came back.' },
            ] },
          { text: 'Feed them first. Talk later.', effect: { rel: 1, flag: 'supper_first' },
            reply: [{ who: 'crane', text: 'Yes. Stories after supper. That was her rule too.' }] },
        ],
      },
      { who: 'crane', text: 'Serve whoever is ready. Nobody minds the order, as long as nobody leaves hungry.' },
      { who: 'STORY', text: 'Chimaek growls at the crane. Under the counter, something small and brass rings once. By itself.' },
    ],
  },
];
export const sceneFor = (levelN) => SCENES.find((s) => s.level === levelN) || null;
export const sceneById = (id) => SCENES.find((s) => s.id === id) || null;

// ---------- story save ----------
export function newStory() {
  return { seen: {}, flags: {}, rel: {}, memories: {}, picks: {} };
}
export function normalizeStory(s) {
  const d = newStory();
  if (!s || typeof s !== 'object') return d;
  for (const k of Object.keys(d)) if (s[k] && typeof s[k] === 'object') d[k] = s[k];
  return d;
}
// Relationship turns into a tip bonus (or a smaller tip) on a happy serve.
export const relTip = (story, spirit) => Math.max(-1, Math.min(2, story.rel[spirit] || 0));
export function relTips(story) {
  const out = {};
  for (const id of Object.keys(SPIRITS)) out[id] = relTip(story, id);
  return out;
}

// ---------- dialogue state machine ----------
// d.cur is the line on screen; d.choice is set while a choice is waiting
// (shown under d.cur). Replays (from the story log) change nothing.
export function startScene(scene, story, { replay = false } = {}) {
  const d = { scene, pc: 0, pending: [], cur: null, choice: null, done: false, replay, flags: { ...story.flags }, picks: [] };
  next(d);
  return d;
}
function shows(step, flags) {
  if (step.if && !flags[step.if]) return false;
  if (step.unless && flags[step.unless]) return false;
  return true;
}
function next(d) {
  while (d.pending.length) {
    const s = d.pending.shift();
    if (shows(s, d.flags)) { d.cur = s; return; }
  }
  const steps = d.scene.steps;
  while (d.pc < steps.length) {
    const s = steps[d.pc++];
    if (!shows(s, d.flags)) continue;
    if (s.choice) {
      d.choice = s.choice;
      if (!d.cur) d.cur = { who: d.scene.spirit, text: '...' };
      return;
    }
    d.cur = s;
    return;
  }
  d.done = true;
}
// Next line. Does nothing while a choice is waiting.
export function advance(d) {
  if (d.done || d.choice) return false;
  next(d);
  return true;
}
export function choose(d, k, story) {
  if (!d.choice || !d.choice[k]) return false;
  const opt = d.choice[k];
  d.choice = null;
  d.picks.push(k);
  const e = opt.effect || {};
  if (e.flag) d.flags[e.flag] = true;
  if (!d.replay && story) {
    const sp = d.scene.spirit;
    story.rel[sp] = (story.rel[sp] || 0) + (e.rel || 0);
    if (e.flag) story.flags[e.flag] = true;
    (story.picks[d.scene.id] ||= []).push(k);
  }
  d.pending = [...(opt.reply || [])];
  next(d);
  return true;
}
// Skip to the end. A choice not made has no effect.
export function skip(d) {
  d.choice = null; d.pending = []; d.pc = d.scene.steps.length; d.done = true;
}
export function finishScene(d, story) {
  if (!d.replay && story) story.seen[d.scene.id] = true;
}
export const speakerName = (who) => (who === 'STORY' ? '' : who === 'YOU' ? 'YOU' : SPIRITS[who]?.name || String(who).toUpperCase());

// ---------- memories (lines unlocked as you serve spirits across nights) ----------
// One new line per spirit per night: `night` is a token for the current night
// (the game object), so a spirit served twice in one night unlocks one line.
export function unlockMemory(story, spirit, nightSet) {
  const sp = SPIRITS[spirit];
  if (!sp || nightSet.has(spirit)) return null;
  const k = story.memories[spirit] || 0;
  if (k >= sp.memories.length) return null;
  nightSet.add(spirit);
  story.memories[spirit] = k + 1;
  return memoryText(spirit, k, story.flags);
}
