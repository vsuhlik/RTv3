import { writable, get } from 'svelte/store';

// The active session object while a timer is running. Null = no session.
export const activeSession = writable(null);

// Live seconds elapsed — drives the timer display
export const timerSecs = writable(0);

let _interval = null;

export function startTimer(sessionData) {
  if (_interval) stopTimer(); // safety: clear any orphan timer

  activeSession.set({ ...sessionData, startTs: Date.now() });
  timerSecs.set(0);
  _interval = setInterval(() => timerSecs.update(s => s + 1), 1000);
}

export function stopTimer() {
  clearInterval(_interval);
  _interval = null;
  const session = get(activeSession);
  activeSession.set(null);
  timerSecs.set(0);
  return session; // caller uses this to build the log entry
}

// Utility: format raw seconds → "MM:SS" or "H:MM:SS"
export function fmtTimer(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }