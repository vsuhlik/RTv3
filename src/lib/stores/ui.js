import { writable } from 'svelte/store';

// Global UI state — sheets that need to overlay from any tab
export const profileSheetOpen = writable(false);