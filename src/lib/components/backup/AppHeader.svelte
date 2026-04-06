<script>
  let {
    ciLabel = 'CI-0',
    profileName = 'Restorer',
    onProfileClick = () => {},
    onCIClick = () => {},
  } = $props();
</script>

<header class="app-header">
  <div class="header-left">
    <!-- Wordmark -->
    <div class="wordmark">
      <span class="wordmark-text">RESTORETRACK</span>
      <span class="wordmark-version">v3.0</span>
    </div>

    <!-- Separator -->
    <div class="header-sep" aria-hidden="true"></div>

    <!-- CI Pill — tappable, navigates to Journey -->
    <button class="ci-pill" on:click={onCIClick} title="Go to Journey">
      {ciLabel}
    </button>
  </div>

  <!-- Profile button -->
  <button class="profile-btn" on:click={onProfileClick}>
    <span class="profile-initial">{profileName.charAt(0).toUpperCase()}</span>
    <span class="profile-name">{profileName}</span>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 16px;
    background: linear-gradient(180deg,
      var(--color-surface-2) 0%,
      var(--color-surface-1) 100%
    );
    border-bottom: 1px solid rgba(196,145,58,0.15);
    position: sticky;
    top: 0;
    z-index: 30;
    /* Glassmorphism — subtle backdrop blur */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .wordmark {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex-shrink: 0;
  }
  .wordmark-text {
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.18em;
    line-height: 1;
  }
  .wordmark-version {
    font-size: 7.5px;
    color: var(--color-text-4);
    font-family: var(--font-sans);
    letter-spacing: 0.05em;
  }

  .header-sep {
    width: 1px;
    height: 20px;
    background: var(--color-edge);
    flex-shrink: 0;
  }

  .ci-pill {
    background: var(--color-accent-tint);
    border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-pill);
    padding: 3px 11px;
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--color-accent);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 150ms, box-shadow 150ms;
  }
  .ci-pill:hover {
    background: rgba(196,145,58,0.14);
    box-shadow: 0 0 8px rgba(196,145,58,0.15);
  }
  .ci-pill:active {
    transform: scale(0.96);
  }

  .profile-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    margin-left: 8px;
    max-width: 160px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--color-edge);
    border-radius: var(--radius-pill);
    padding: 4px 10px 4px 6px;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    overflow: hidden;
  }
  .profile-btn:hover {
    background: var(--color-accent-tint);
    border-color: var(--color-accent-ring);
  }

  .profile-initial {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-accent-tint);
    border: 1px solid var(--color-accent-ring);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-accent);
    flex-shrink: 0;
  }
  .profile-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  svg {
    color: var(--color-text-4);
    flex-shrink: 0;
  }
</style>