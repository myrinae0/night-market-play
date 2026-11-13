// The save: progress (stars per level, the purse, upgrades, the story) and
// settings (volumes, mute, tap controls). Pure; main.js does the localStorage
// part. Reset progress (Settings) erases the progress and keeps the settings.
import { newStory, normalizeStory } from './story.js';

export const SETTINGS_KEYS = ['muted', 'musicVol', 'ambVol', 'sfxVol', 'tapControls'];
export const defaultSettings = () => ({ muted: false, musicVol: 0.7, ambVol: 0.6, sfxVol: 1, tapControls: false });
export const freshProgress = () => ({ stars: {}, wallet: 0, upgrades: {}, story: newStory(), endlessBest: 0 });
export const freshSave = () => ({ ...freshProgress(), ...defaultSettings() });

// Fills in anything missing or broken in a save read from storage.
export function normalizeSave(raw) {
  const s = { ...freshSave(), ...(raw && typeof raw === 'object' ? raw : {}) };
  s.story = normalizeStory(s.story);
  if (!s.stars || typeof s.stars !== 'object') s.stars = {};
  if (!s.upgrades || typeof s.upgrades !== 'object') s.upgrades = {};
  s.wallet = Math.max(0, Math.round(Number(s.wallet) || 0));
  s.endlessBest = Math.max(0, Math.round(Number(s.endlessBest) || 0));
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
