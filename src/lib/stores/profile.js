import { writable, get } from 'svelte/store';
import { idb } from '$lib/db/idb.js';
import { browser } from '$app/environment';

export const DEFAULT_CHAR = {
  name:            'Restorer',
  ciStart:         0,
  ciCurrent:       0,
  ciGoal:          9,
  dailyGoalMin:    480,   // 8 hours TUT — changeable in settings
  totalMinutes:    0,
  totalSessions:   0,
  streak:          0,
  longestStreak:   0,
  lastSessionDate: null,
  lastCIUpdate:    null,
  startDate:       null,
  communityEnabled: false,
};

function createPersistedStore(key, defaultValue) {
  const store = writable(defaultValue);

  // On startup, load from IDB (browser only — SSR safe)
  if (browser) {
    idb.get(key).then(saved => {
      if (saved !== null) store.set({ ...defaultValue, ...saved });
    });
  }

  return {
    subscribe: store.subscribe,
    get: () => get(store),

    set(value) {
      store.set(value);
      if (browser) idb.set(key, value);
    },

    update(fn) {
      const next = fn(get(store));
      store.set(next);
      if (browser) idb.set(key, next);
    },
  };
}

export const char = createPersistedStore('char', DEFAULT_CHAR);