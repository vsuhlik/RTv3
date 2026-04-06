<script>
  // SVELTE 5: Destructure props from $props()
  let { 
    ciLabel = 'CI-0', 
    profileName = 'Restorer', 
    onProfileClick, 
    onCIClick 
  } = $props();
</script>

<header class="app-header">
  <div class="header-left">
    <div class="wordmark">
      <span class="wordmark-text">RESTORETRACK</span>
      <span class="wordmark-version">v3.0</span>
    </div>
    <div class="header-sep" aria-hidden="true"></div>
    
    <button class="ci-pill" onclick={onCIClick} title="Go to Journey">
      {ciLabel}
    </button>
  </div>

  <button class="profile-btn" onclick={onProfileClick}>
    <span class="profile-initial">{profileName.charAt(0).toUpperCase()}</span>
    <span class="profile-name">{profileName}</span>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
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
    background: linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface-1) 100%);
    border-bottom: 1px solid rgba(196,145,58,0.15);
    position: sticky;
    top: 0;
    z-index: 30;
    backdrop-filter: blur(12px);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .wordmark-text {
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.18em;
  }

  .wordmark-version {
    font-size: 8px;
    font-weight: 500;
    color: var(--color-text-4);
    margin-left: 4px;
    opacity: 0.6;
  }

  .header-sep {
    width: 1px;
    height: 14px;
    background: var(--color-edge);
    opacity: 0.5;
  }

  .ci-pill {
    background: var(--color-accent-tint);
    border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-pill);
    padding: 3px 11px;
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--color-accent);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ci-pill:hover {
    background: var(--color-accent);
    color: var(--color-surface-1);
  }

  .profile-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--color-edge);
    border-radius: var(--radius-pill);
    padding: 4px 10px 4px 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .profile-btn:hover {
    background: rgba(255,255,255,0.06);
  }

  .profile-initial {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-accent-tint);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-accent);
  }

  .profile-name {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--color-text-2);
  }
</style>