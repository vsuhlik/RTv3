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

<nav class="pill-nav" aria-label="Main navigation">
  {#each TABS as tab}
    {@const isActive = $currentTab === tab.id}
    {@const hasBadge = !!badges[tab.id]}
    <button
      class="nav-item"
      class:active={isActive}
      onclick={() => navigateTo(tab.id)}
      aria-label={tab.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span class="icon-wrap">
        {#key isActive}
        <svg
          width="20" height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width={isActive ? '2' : '1.5'}
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class:icon-pop={isActive}
        >
          {@html ICONS[tab.id]}
        </svg>
        {/key}
        {#if hasBadge}
          <span class="badge-dot" aria-hidden="true"></span>
        {/if}
      </span>
      {#if isActive}
        <span class="active-label">{tab.label}</span>
      {/if}
    </button>
  {/each}
</nav>

<style>
  .pill-nav {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;

    display: flex;
    align-items: center;
    gap: 2px;
    padding: 8px 10px;

    background: oklch(14% 0.04 278 / 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-pill-nav);

    /* Never wider than the viewport, but shrinks if needed */
    max-width: calc(100vw - 32px);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: none;
    border: none;
    border-radius: var(--radius-pill);
    color: var(--color-text-3);
    cursor: pointer;
    transition:
      color 200ms,
      background 200ms,
      padding 300ms var(--ease-out-expo);
    position: relative;
    white-space: nowrap;
    min-width: 40px;
    justify-content: center;
  }

  .nav-item.active {
    color: var(--color-accent);
    background: var(--color-accent-tint);
    /* Expand to show label — handled by the label render */
  }

  .icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .active-label {
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--color-accent);
    animation: label-in 220ms var(--ease-out-expo) both;
  }

  @keyframes label-in {
    from { opacity: 0; transform: translateX(-4px); max-width: 0; }
    to   { opacity: 1; transform: translateX(0);    max-width: 80px; }
  }

  .badge-dot {
    position: absolute;
    top: -2px;
    right: -4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-critical);
    border: 1.5px solid oklch(14% 0.04 278);
  }

  @media (hover: hover) {
    .nav-item:not(.active):hover {
      color: var(--color-text-1);
      background: oklch(100% 0 0 / 0.04);
    }
  }

  .icon-pop {
    animation: nav-icon-pop 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    transform-origin: center;
  }
  @keyframes nav-icon-pop {
    0%   { transform: scale(0.65) rotate(-8deg); opacity: 0.5; }
    65%  { transform: scale(1.18) rotate(3deg);  opacity: 1;   }
    100% { transform: scale(1)    rotate(0deg);  opacity: 1;   }
  }
</style>