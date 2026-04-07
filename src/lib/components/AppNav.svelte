<script>
  import { currentTab, TABS, navigateTo } from '$lib/stores/navigation.js';

  const ICONS = {
    today:     '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>',
    journey:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    photos:    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    reports:   '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    badges:    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>',
    community: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  };

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
      <span class="nav-dot" aria-hidden="true"></span>
      <span class="nav-icon-wrap">
        <svg
          width="21" height="21"
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
    </button>
  {/each}
</nav>

<style>
  .app-nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    background: var(--color-surface-1);
    border-top: 1px solid var(--color-edge);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    z-index: 30;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .nav-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 2px 8px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-4);
    transition: color 180ms;
    min-height: 58px;
    position: relative;
  }

  .nav-btn.active { color: var(--color-accent); }

  .nav-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: transparent;
    transition: background 180ms;
    flex-shrink: 0;
  }

  .nav-btn.active .nav-dot {
    background: var(--color-accent);
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
    top: -2px; right: -4px;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--color-critical);
    border: 1.5px solid var(--color-surface-1);
  }

  @media (hover: hover) {
    .nav-btn:not(.active):hover { color: var(--color-text-2); }
  }
</style>