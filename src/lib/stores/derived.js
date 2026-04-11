import { derived } from 'svelte/store';
import { char } from './profile.js';
import { logs } from './logs.js';
import { activeSession, timerSecs } from './timer.js';

// Returns today's date string in 'YYYY-MM-DD' format
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// All non-rest log entries from today
export const todayLogs = derived(logs, $l =>
  $l.filter(e => e.date === todayStr() && !e.isRest)
);

// Total minutes today = committed logs + live timer seconds
export const todayMin = derived(
  [todayLogs, timerSecs, activeSession],
  ([$tl, $ts, $as]) => {
    const committed = $tl.reduce((sum, l) =>
      sum + (l.countTowardGoal !== false ? (l.dur || 0) : 0), 0);
    const timerCounts = $as?.countTowardGoal !== false;
    return committed + (timerCounts ? Math.floor($ts / 60) : 0);
  }
);

// 0–100 progress toward daily goal
export const goalPct = derived(
  [todayMin, char],
  ([$tm, $c]) => Math.min(100, Math.round(($tm / ($c.dailyGoalMin || 480)) * 100))
);

// Has the user marked today as a rest day?
export const isRestDay = derived(logs, $l =>
  $l.some(e => e.date === todayStr() && e.isRest === true)
);

// Minutes remaining to hit today's goal (never negative)
export const minRemaining = derived(
  [todayMin, char],
  ([$tm, $c]) => Math.max(0, ($c.dailyGoalMin || 480) - $tm)
);