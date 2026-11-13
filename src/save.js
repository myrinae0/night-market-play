// The save: progress (stars per level, the purse, upgrades, the story) and
// settings (volumes, mute, tap controls, colour patterns, the first-night tips
// already seen). Pure; main.js does the localStorage
// part. Reset progress (Settings) erases the progress and keeps the settings.
import { newStory, normalizeStory } from './story.js';
import { freshGoals, normalizeGoals, refreshGoals } from './goals.js';
import { tipsFromStars } from './tips.js';

// patterns: colour patterns (colourblind mode), off by default.
// tipsSeen: { night1, grill, ... } first-night tips already shown (src/tips.js).
export const SETTINGS_KEYS = ['muted', 'musicVol', 'ambVol', 'sfxVol', 'tapControls', 'patterns', 'tipsSeen'];
export const defaultSettings = () => ({ muted: false, musicVol: 0.7, ambVol: 0.6, sfxVol: 1, tapControls: false, patterns: false, tipsSeen: {} });
// goals, badges, stats: daily goals and badges (src/goals.js).
// winterBest: the best winter (endless) night, part 3.
export const freshProgress = () => ({ stars: {}, wallet: 0, upgrades: {}, story: newStory(), endlessBest: 0, winterBest: 0, ...freshGoals() });
export const freshSave = () => ({ ...freshProgress(), ...defaultSettings() });

// Fills in anything missing or broken in a save read from storage.
export function normalizeSave(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const s = { ...freshSave(), ...r };
  s.story = normalizeStory(s.story);
  if (!s.stars || typeof s.stars !== 'object') s.stars = {};
  if (!s.upgrades || typeof s.upgrades !== 'object') s.upgrades = {};
  s.wallet = Math.max(0, Math.round(Number(s.wallet) || 0));
  s.endlessBest = Math.max(0, Math.round(Number(s.endlessBest) || 0));
  s.winterBest = Math.max(0, Math.round(Number(s.winterBest) || 0));
  s.patterns = s.patterns === true;
  // Saves from before the tips: nights already cleared count as taught.
  s.tipsSeen = r.tipsSeen && typeof r.tipsSeen === 'object' ? { ...r.tipsSeen } : tipsFromStars(s.stars);
  normalizeGoals(s);
  return s;
}

// Erases all progress in place (the app holds on to this object) and keeps
// the settings. Anything else in the save (old or unknown fields) goes too.
export function clearProgress(s) {
  const keep = {};
  for (const k of SETTINGS_KEYS) if (k in s) keep[k] = s[k];
  for (const k of Object.keys(s)) delete s[k];
  return Object.assign(s, freshSave(), keep);
}
