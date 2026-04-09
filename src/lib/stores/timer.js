import { writable, get } from 'svelte/store';
import { idb } from '$lib/db/idb.js';
import { browser } from '$app/environment';

const SESSION_KEY = 'activeSession_v1';

export const activeSession = writable(null);
export const timerSecs     = writable(0);

let _interval = null;

// Every tick: derive seconds from wall-clock, not a counter.
// This means background time, closed tabs, locked screens — all accurate.
function _tick() {
  const s = get(activeSession);
  if (s?.startTs) {
    timerSecs.set(Math.floor((Date.now() - s.startTs) / 1000));
  }
}

function _startInterval() {
  if (_interval) clearInterval(_interval);
  _interval = setInterval(_tick, 1000);
}

// On load: restore any session that was open when app was closed
if (browser) {
  idb.get(SESSION_KEY).then(saved => {
    if (saved?.startTs) {
      activeSession.set(saved);
      timerSecs.set(Math.floor((Date.now() - saved.startTs) / 1000));
      _startInterval();
    }
  });
}

export function startTimer(sessionData) {
  if (_interval) { clearInterval(_interval); _interval = null; }
  const session = { ...sessionData, startTs: Date.now() };
  activeSession.set(session);
  timerSecs.set(0);
  if (browser) idb.set(SESSION_KEY, session);
  _startInterval();
}

// Called when user edits the start time — updates both store AND IDB
export function updateSessionStart(newStartTs) {
  activeSession.update(s => {
    const updated = { ...s, startTs: newStartTs };
    if (browser) idb.set(SESSION_KEY, updated);
    return updated;
  });
  timerSecs.set(Math.floor((Date.now() - newStartTs) / 1000));
}

export function stopTimer() {
  clearInterval(_interval);
  _interval = null;
  const session = get(activeSession);
  activeSession.set(null);
  timerSecs.set(0);
  if (browser) idb.del(SESSION_KEY);
  return session;
}

export function fmtTimer(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}