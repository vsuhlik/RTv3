import { writable } from 'svelte/store';

export const TABS = [
  { id: 'today',     label: 'Today',     icon: 'today'     },
  { id: 'journey',   label: 'Journey',   icon: 'journey'   },
  { id: 'photos',    label: 'Photos',    icon: 'photos'    },
  { id: 'reports',   label: 'Reports',   icon: 'reports'   },
  { id: 'badges',    label: 'Badges',    icon: 'badges'    },
  { id: 'community', label: 'Community', icon: 'community' },
];

export const currentTab = writable('today');
export const previousTab = writable('today');

export function navigateTo(tabId) {
  currentTab.update(prev => {
    previousTab.set(prev);
    return tabId;
  });
}