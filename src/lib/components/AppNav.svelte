<script>
  import { currentTab, TABS, navigateTo } from '$lib/stores/navigation.js';

  // SVG paths for each tab icon — inline for performance
  const ICONS = {
    today:     '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>',
    journey:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    photos:    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    reports:   '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    badges:    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>',
    community: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  };

  /** Optional badges — { community: 3 } shows a dot on that tab */
  let { badges = {} } = $props();
</script>

<nav class="app-nav">
  {#each TABS as tab}
    {@const isActive = $currentTab === tab.id}
    {@const hasBadge = !!badges[tab.id]}
    <button
      class="nav-btn"
      class:active={isActive}
      onclick={() => navigateTo(tab.id)}
      aria-label={tab.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span class="nav-icon-wrap">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width={isActive ? '1.75' : '1.5'}
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          {@html ICONS[tab.id]}
        </svg>
        {#if hasBadge}
          <span class="nav-badge" aria-hidden="true"></span>
        {/if}
      </span>
      <span class="nav-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .app-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    background: var(--color-surface-1);
    border-top: 1px solid rgba(196,145,58,0.12);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    z-index: 30;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .nav-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 7px 2px 6px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-4);
    transition: color 200ms;
    /* Tap target */
    min-height: 56px;
    position: relative;
  }

  .nav-btn.active {
    color: var(--color-text-1);
  }

  /* Active indicator bar at top */
  .nav-btn.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    border-radius: 0 0 2px 2px;
    background: var(--color-accent);
    box-shadow: 0 0 8px rgba(196,145,58,0.5);
  }

  .nav-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .nav-badge {
    position: absolute;
    top: -1px;
    right: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-critical);
    border: 1.5px solid var(--color-surface-1);
  }

  .nav-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.03em;
    font-family: var(--font-sans);
    line-height: 1;
  }

  /* Hover — desktop / tablet preview */
  @media (hover: hover) {
    .nav-btn:not(.active):hover {
      color: var(--color-text-2);
    }
  }
</style>