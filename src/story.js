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
  // ---------- part 2 ----------
  {
    id: 'l7', level: 7, spirit: 'wisp', title: 'Steam rising',
    steps: [
      { who: 'STORY', text: 'The old steamer was under the counter, behind Chimaek. She let you take it. Just this once.' },
      { who: 'STORY', text: 'When the water heats, the steam does not rise. It curls up on the counter and looks at you.' },
      { who: 'wisp', text: '...Hello. ...You lit the fire under me.' },
      { who: 'wisp', text: '...I was the steam from her last batch of buns. ...The night she closed. ...I never went up.' },
      {
        choice: [
          { text: 'Why did you stay?', effect: { rel: 1, flag: 'gim_why' },
            reply: [{ who: 'wisp', text: '...She said someone would come back. ...I wanted to see who.' }, { who: 'wisp', text: '...It is you. ...I think.' }] },
          { text: 'You can sleep in the basket.', effect: { rel: 1, flag: 'gim_stay' },
            reply: [{ who: 'wisp', text: '...Really? ...It is warm in there. ...She let me too.' }] },
          { text: 'Who were the buns for?', effect: { rel: 0, flag: 'gim_winter' },
            reply: [{ who: 'wisp', text: '...For someone in the long winter. ...Someone who waited by the river.' }] },
        ],
      },
      { who: 'wisp', text: '...Lid on, or the steam runs away. ...Like me.' },
      { who: 'STORY', text: 'Inside the bamboo lid, grandma wrote three words: FOR THE LONG WINTER.' },
    ],
  },
  {
    id: 'l8', level: 8, spirit: 'fox', title: 'Old regulars',
    steps: [
      { who: 'STORY', text: 'The fox is back, with a sack over one shoulder. The mask sits straight tonight.' },
      { who: 'fox', if: 'yeo_hum', text: 'You hummed last time. Badly. I liked it.' },
      { who: 'fox', unless: 'yeo_hum', text: 'You again. Still curious about my face?' },
      { who: 'fox', text: 'Forty sausages. I said I would pay her back. Here. Forty coins.' },
      { who: 'STORY', text: 'The coins are old. Each one has a little bell stamped on it.' },
      { who: 'fox', text: 'The bell made this market. Ring it and the street remembers itself.' },
      {
        choice: [
          { text: 'Then why did she stop ringing it?', effect: { rel: 1, flag: 'bell_why' },
            reply: [{ who: 'fox', text: 'Her hands, they say. Cold hands.' }, { who: 'fox', text: 'Hmph. A cold hand can still ring a bell. She chose not to.' }] },
          { text: 'Keep your coins. You paid enough.', effect: { rel: 1, flag: 'yeo_debt' },
            reply: [{ who: 'fox', text: '...She said the same thing. Every time.' }, { who: 'fox', text: 'Fine. I will eat them off instead.' }] },
        ],
      },
      { who: 'fox', text: 'The regulars are coming back. They remember how they were treated. So do I.' },
      { who: 'STORY', text: 'Chimaek growls. Then, for the first time, she lets the fox scratch her ear.' },
    ],
  },
  {
    id: 'l9', level: 9, spirit: 'lantern', title: 'Good dog',
    steps: [
      { who: 'STORY', text: 'Deung floats in early, and glows a little brighter when it sees Chimaek.' },
      { who: 'lantern', if: 'deung_told', text: 'You told me about her, that first night. So I will tell you about the dog.' },
      { who: 'lantern', unless: 'deung_told', text: 'You never said where she went. I will tell you about the dog anyway.' },
      { who: 'lantern', text: 'She has not changed. Not one whisker. Do you know how long I have known this dog?' },
      {
        choice: [
          { text: 'How long?', effect: { rel: 1, flag: 'dog_age' },
            reply: [{ who: 'lantern', text: 'Since the first night of the market. Longer than your grandma.' }, { who: 'lantern', text: 'Dogs do not live that long. Do they?' }] },
          { text: 'She is a good dog.', effect: { rel: 1, flag: 'dog_good' },
            reply: [{ who: 'lantern', text: 'The best. She has guarded that counter every night. Even the dark ones.' }] },
        ],
      },
      { who: 'lantern', text: 'Your grandma never fed her from the pan. No sauce, no onion, no burnt bits.' },
      { who: 'lantern', text: 'Just plain meat off the grill, now and then. She wagged so hard the lanterns shook.' },
      { who: 'STORY', text: 'Chimaek looks at the grill. Then at you. Then at the grill.' },
    ],
  },
  {
    id: 'l10', level: 10, spirit: 'clay', title: 'Boiling point',
    steps: [
      { who: 'STORY', text: 'The noodle pot sits on the back burner. It has a face. It is frowning at you.' },
      { who: 'clay', text: 'Hmph. Took you long enough. Water. In me. Now.' },
      { who: 'clay', text: 'Boil first. Noodles after. Never before. Mushy noodles are an insult.' },
      { who: 'clay', if: 'gim_stay', text: 'And tell that wisp to stop sleeping in the steamer. It fogs up my lid.' },
      {
        choice: [
          { text: 'Thank you for waiting.', effect: { rel: 1, flag: 'ttuk_thanks' },
            reply: [{ who: 'clay', text: '...Hmph. Thank you. Hmph. Nobody says that to a pot.' }] },
          { text: 'Who put a face on a pot?', effect: { rel: -1, flag: 'ttuk_face' },
            reply: [{ who: 'clay', text: 'Who put a face on YOU? Rude.' }] },
        ],
      },
      { who: 'clay', text: 'The night she closed, she put out my fire herself. Then she went down to the river.' },
      { who: 'clay', text: 'She came back without her scarf. And with very cold hands.' },
      { who: 'STORY', text: 'Chimaek stares at the pot. The pot stares back. Neither one blinks.' },
    ],
  },
  {
    id: 'l11', level: 11, spirit: 'moth', title: 'Specials board',
    steps: [
      { who: 'STORY', text: 'The moth is back, out of breath, with a second letter in its bag.' },
      { who: 'moth', text: 'Post! A real one this time. The ink is still wet. Well. Damp.' },
      { who: 'moth', if: 'letter_read', text: 'You heard the first one. This is the one I said was not ready.' },
      { who: 'moth', unless: 'letter_read', text: 'You kept the first one. Patient. This one would not wait.' },
      {
        choice: [
          { text: 'Read it to me.', effect: { rel: 1, flag: 'letter2_read' },
            reply: [
              { who: 'moth', text: 'Ahem. One special a night. Make it the best thing you cook.' },
              { who: 'moth', text: 'And if the bell rings by itself, do not be afraid. It means someone is coming home.' },
            ] },
          { text: 'Who sent it?', effect: { rel: 0, flag: 'letter2_who' },
            reply: [
              { who: 'moth', text: 'Her. Written before she closed. Posted after. Do not ask me how. Post is post.' },
              { who: 'moth', text: 'It says: one special a night. And when the bell rings by itself, someone is coming home.' },
            ] },
        ],
      },
      { who: 'moth', text: 'The specials board is behind the cooler. Tonight one dish pays double.' },
      { who: 'STORY', text: 'Under the counter, the bell hums. Very quietly. Chimaek puts her paw on it.' },
    ],
  },
  {
    id: 'l12', level: 12, spirit: 'frog', title: 'Rain and rush',
    steps: [
      { who: 'STORY', text: 'Rain again. The frog hops in, soaked, and the street fills up behind it.' },
      { who: 'frog', text: 'Ribbit! Everyone is coming in out of the rain! Quick snacks, quick drinks, quick quick!' },
      { who: 'frog', if: 'frog_teacher', text: 'And my student is still here! Toss and land, remember?' },
      { who: 'frog', text: 'Rain is easy. Rain is a river falling. It is ice I am scared of.' },
      {
        choice: [
          { text: 'What happened at the river?', effect: { rel: 1, flag: 'river_told' },
            reply: [
              { who: 'frog', text: 'The river froze all the way down. Something came up through the ice. Something cold and very hungry.' },
              { who: 'frog', text: 'She fed it. Every night, all winter. Her hands were warm when she went. Not when she came back.' },
            ] },
          { text: 'Then stay here where it is warm.', effect: { rel: 1, flag: 'frog_stay' },
            reply: [
              { who: 'frog', text: 'Under the awning? With the dog? ...Alright. If she does not mind.' },
              { who: 'STORY', text: 'Chimaek does mind. She stays hidden anyway.' },
            ] },
        ],
      },
      { who: 'frog', text: 'When the crowd rushes in, drinks and snacks first! The slow food can wait a little.' },
      { who: 'STORY', text: 'Chimaek has hidden behind the counter again. Only her ears show.' },
    ],
  },
  {
    id: 'l13', level: 13, spirit: 'rabbit', title: 'Lantern festival',
    steps: [
      { who: 'STORY', text: 'Every lantern on the street is lit tonight. Even the broken ones. The moon is full and very close.' },
      { who: 'rabbit', text: 'So. The stall is open, the bell is humming, and the dog is well fed. Good.' },
      { who: 'rabbit', text: 'I am Dal. I pound the rice cakes on the moon. Once a year I come down for the festival.' },
      { who: 'rabbit', text: 'Long ago I gave your grandma a bell, a dog and a promise to keep. She kept them all. Almost.' },
      { who: 'rabbit', if: 'bell_known', text: 'The crane told you the bell opens the market. It also tells everyone where the market is.' },
      {
        choice: [
          { text: 'What promise?', effect: { rel: 1, flag: 'dal_promise' },
            reply: [
              { who: 'rabbit', text: 'That the market would never let anyone go hungry. Not even the ones who come in winter.' },
              { who: 'rabbit', text: 'That is all I can say tonight. The rest is hers to tell, not mine.' },
            ] },
          { text: 'What is a keeper?', effect: { rel: 1, flag: 'dal_keeper' },
            reply: [
              { who: 'rabbit', text: 'The one who rings the bell. The one the street listens to.' },
              { who: 'rabbit', text: 'She was the keeper. Now there is none. Or there is one who does not know it yet.' },
            ] },
          { text: 'Why a dog?', effect: { rel: 0, flag: 'dal_dog' },
            reply: [{ who: 'rabbit', text: 'Every bell needs a guard. Bells are loud. Some things that hear them should not come.' }] },
        ],
      },
      { who: 'rabbit', text: 'Tonight, VIPs. Gold tickets. They pay double, and they do not like to wait.' },
      { who: 'STORY', text: 'Under the counter, the bell rings twice. Chimaek stands up and looks toward the river.' },
    ],
  },
  // After night 13 (the first time it is cleared): the part 2 cliffhanger.
  {
    id: 'l13b', level: 13, after: true, spirit: null, dog: 'growl', frost: true, frostAt: 2, title: 'The first frost',
    steps: [
      { who: 'STORY', text: 'The festival ends. The last lantern goes out. Then the bell rings a third time.' },
      { who: 'STORY', text: 'Frost runs across the counter. The rain barrels freeze. Your breath turns white.' },
      { who: 'STORY', text: 'Chimaek barks. Deung says later she has never barked before. Not once, in all those years.' },
      { who: 'VOICE', text: 'She promised me one more bowl.' },
      { who: 'VOICE', text: 'Before the river thaws. She promised.' },
      {
        choice: [
          { text: 'She is gone.', effect: { flag: 'frost_told' },
            reply: [{ who: 'VOICE', text: 'Then the promise is yours. Keeper.' }] },
          { text: 'Who are you?', effect: { flag: 'frost_who' },
            reply: [{ who: 'VOICE', text: 'The long winter. She knew my name. Ask the dog.' }] },
        ],
      },
      { who: 'STORY', text: 'The frost melts as fast as it came. Chimaek keeps staring at the dark end of the street.' },
      { who: 'STORY', text: 'To be continued in part 3.' },
    ],
  },
];
// The scene before a level, and the one after it (only night 13 has one).
export const sceneFor = (levelN) => SCENES.find((s) => s.level === levelN && !s.after) || null;
export const afterSceneFor = (levelN) => SCENES.find((s) => s.level === levelN && s.after) || null;
export const sceneById = (id) => SCENES.find((s) => s.id === id) || null;

// ---------- story save ----------
export function newStory() {
  return { seen: {}, flags: {}, rel: {}, memories: {}, picks: {}, service: {} };
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

// ---------- regulars (level 8 on) ----------
// Every spirit's service record across nights: happy serves, and misses
// (a walk-out or a wrong order). Spirits with a record are regulars.
export function recordService(story, spirit, happy) {
  if (!SPIRITS[spirit]) return;
  const r = (story.service[spirit] ||= { happy: 0, missed: 0 });
  if (happy) r.happy += 1; else r.missed += 1;
}
// A regular's mood: from your story choices (relationship) and how you have
// served them. null for a spirit who has never been served (not a regular).
export function moodFor(story, spirit) {
  const r = story.service[spirit];
  if (!r || r.happy + r.missed === 0) return null;
  let score = relTip(story, spirit);
  if (r.happy >= 3) score += 1;
  if (r.missed >= 2) score -= 1;
  if (r.missed > r.happy) score -= 1;
  return score >= 2 ? 'glad' : score <= -1 ? 'grumpy' : 'ok';
}
export function moodsFor(story) {
  const out = {};
  for (const id of Object.keys(SPIRITS)) { const m = moodFor(story, id); if (m) out[id] = m; }
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
    if (sp) story.rel[sp] = (story.rel[sp] || 0) + (e.rel || 0);
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
export const speakerName = (who) => (who === 'STORY' ? '' : who === 'YOU' ? 'YOU' : who === 'VOICE' ? '???' : SPIRITS[who]?.name || String(who).toUpperCase());

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
