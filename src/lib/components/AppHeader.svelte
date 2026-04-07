<script>
  import { profileSheetOpen } from '$lib/stores/ui.js';

  let {
    ciLabel = 'CI-0',
    onCIClick,
  } = $props();
</script>

<header class="app-header">
  <div class="header-left">
    <span class="wordmark">RESTORETRACK</span>
    <div class="header-sep" aria-hidden="true"></div>
    <button class="ci-pill" onclick={onCIClick} title="Go to Journey">
      {ciLabel}
    </button>
  </div>

  <button class="profile-btn" onclick={() => profileSheetOpen.set(true)} aria-label="Open profile">
    <span class="profile-initial">R</span>
  </button>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: var(--color-surface-1);
    border-bottom: 1px solid var(--color-edge);
    position: sticky;
    top: 0;
    z-index: 30;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.2em;
    line-height: 1;
    flex-shrink: 0;
  }

  .header-sep {
    width: 1px;
    height: 16px;
    background: var(--color-edge);
    flex-shrink: 0;
  }

  .ci-pill {
    background: var(--color-accent-tint);
    border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-pill);
    padding: 3px 12px;
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-accent);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 150ms;
  }
  .ci-pill:hover { background: var(--color-accent-dim); }
  .ci-pill:active { transform: scale(0.96); }

  .profile-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--color-accent-tint);
    border: 1px solid var(--color-accent-ring);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 150ms;
    flex-shrink: 0;
  }
  .profile-btn:hover { background: var(--color-accent-dim); }

  .profile-initial {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-accent);
    line-height: 1;
  }
</style>