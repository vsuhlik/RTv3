import { writable, get } from 'svelte/store';
import { idb } from '$lib/db/idb.js';
import { browser } from '$app/environment';

// A log entry looks like:
// { id, date:'YYYY-MM-DD', startTs, endTs, dur (minutes),
//   method, category:'active'|'passive', tension:'low'|'med'|'high',
//   notes, isRest:false }

function createLogsStore() {
  const store = writable([]);

  if (browser) {
    idb.get('logs').then(saved => {
      if (saved !== null) store.set(saved);
    });
  }

  function persist(updated) {
    store.set(updated);
    if (browser) idb.set('logs', updated);
  }

  return {
    subscribe: store.subscribe,
    get: () => get(store),

    add(entry) {
      const updated = [entry, ...get(store)];
      persist(updated);
    },

    remove(id) {
      const updated = get(store).filter(l => l.id !== id);
      persist(updated);
    },

    setAll(list) {
      persist(list);
    },
  };
}

export const logs = createLogsStore();