<script>
  import { profileSheetOpen }     from '$lib/stores/ui.js';
  import { char, DEFAULT_CHAR }   from '$lib/stores/profile.js';
  import { logs }                 from '$lib/stores/logs.js';

  let editName = $state('');
  $effect(() => {
    if ($profileSheetOpen) {
      editName = $char.name ?? 'Restorer';
      showDeleteConfirm = false;
    }
  });

  let showDeleteConfirm = $state(false);
  let importInput       = $state(null);

  function saveName() {
    const n = editName.trim();
    if (n) char.update(c => ({ ...c, name: n }));
  }

  function fmtMin(m) {
    if (!m) return '0m';
    const h = Math.floor(m / 60), r = m % 60;
    return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m}m`;
  }

  async function exportLocal() {
    const data = { version: 3, exportDate: new Date().toISOString(), char: $char, logs: $logs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `restoretrack-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importLocal(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.char) char.set({ ...DEFAULT_CHAR, ...data.char });
      if (data.logs) logs.setAll(data.logs);
      profileSheetOpen.set(false);
    } catch {
      alert('Import failed — check the file format.');
    }
  }

  function deleteAll() {
    char.set({ ...DEFAULT_CHAR });
    logs.setAll([]);
    profileSheetOpen.set(false);
  }

  function close() { profileSheetOpen.set(false); }
</script>

{#if $profileSheetOpen}
  <div class="ps-backdrop" role="dialog" aria-modal="true" aria-label="Profile">
    <button class="backdrop-dismiss" onclick={close} aria-label="Close profile"></button>
    <div class="ps-sheet animate-slide-up">
      <div class="sheet-handle"></div>

      <!-- Avatar + name -->
      <div class="ps-hero">
        <div class="ps-avatar">
          <span class="ps-initial">{(editName || 'R').charAt(0).toUpperCase()}</span>
        </div>
        <input
          class="input-field ps-name-input"
          bind:value={editName}
          placeholder="Your name"
          onblur={saveName}
          onkeydown={e => e.key === 'Enter' && saveName()}
        />
        <span class="ps-name-hint">Tap to rename</span>
      </div>

      <!-- Stats snapshot -->
      <div class="ps-stats">
        <div class="ps-stat">
          <span class="ps-stat-val">{$char.totalSessions ?? 0}</span>
          <span class="ps-stat-key">Sessions</span>
        </div>
        <div class="ps-stat">
          <span class="ps-stat-val">{fmtMin($char.totalMinutes)}</span>
          <span class="ps-stat-key">Total TUT</span>
        </div>
        <div class="ps-stat">
          <span class="ps-stat-val">🔥 {$char.streak ?? 0}</span>
          <span class="ps-stat-key">Streak</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Local Backup -->
      <div class="ps-section">
        <p class="section-label">Local Backup</p>
        <div class="ps-row">
          <button class="btn-ghost flex-1" onclick={exportLocal}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button class="btn-ghost flex-1" onclick={() => importInput?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>
          <input bind:this={importInput} type="file" accept=".json" style="display:none" onchange={importLocal} />
        </div>
      </div>

      <!-- Cloud Backup -->
      <div class="ps-section">
        <p class="section-label">Cloud Backup</p>
        <div class="ps-coming-soon">☁️ Firebase sync — Phase 2</div>
      </div>

      <!-- Feedback -->
      <div class="ps-section">
        <p class="section-label">Feedback</p>
        <a class="btn-ghost ps-feedback"
          href="mailto:restoretrack@gmail.com?subject=RestoreTrack%20Feedback&body=Hi%2C%20I%20wanted%20to%20share%20some%20feedback%20about%20RestoreTrack%3A%0A%0A"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Send Feedback
        </a>
      </div>

      <div class="divider"></div>

      <!-- Danger -->
      {#if showDeleteConfirm}
        <div class="ps-delete-confirm">
          <p class="ps-delete-warning">This permanently deletes all your data and cannot be undone.</p>
          <button class="btn-danger w-full" onclick={deleteAll}>Yes, Delete Everything</button>
          <button class="btn-ghost"         onclick={() => showDeleteConfirm = false} style="margin-top:8px">Cancel</button>
        </div>
      {:else}
        <button class="btn-danger w-full" onclick={() => showDeleteConfirm = true}>
          Delete Profile &amp; All Data
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .ps-backdrop {
    position: fixed; inset: 0;
    background: oklch(0% 0 0 / 0.78); backdrop-filter: blur(6px);
    z-index: 55; display: flex; align-items: flex-end; justify-content: center;
    max-width: 480px; margin: 0 auto;
  }
  .ps-sheet {
    background: var(--color-surface-1); border: 1px solid var(--color-edge);
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
    padding: 20px 20px 60px; width: 100%;
    max-height: 92dvh; overflow-y: auto;
    box-shadow: var(--shadow-sheet);
  }
  .ps-hero { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0 20px; }
  .ps-avatar {
    width: 76px; height: 76px; border-radius: 50%;
    background: var(--color-accent-tint); border: 2px solid var(--color-accent-ring);
    box-shadow: 0 0 28px var(--color-accent-dim);
    display: flex; align-items: center; justify-content: center;
  }
  .ps-initial { font-family: var(--font-display); font-size: 30px; font-weight: 700; color: var(--color-accent); }
  .ps-name-input { text-align: center; font-size: 18px; font-weight: 700; width: 100%; max-width: 240px; background: transparent; border-color: transparent; }
  .ps-name-input:focus { border-color: var(--color-accent); background: var(--color-surface-2); }
  .ps-name-hint { font-size: 10px; color: var(--color-text-4); }
  .ps-stats { display: flex; gap: 8px; margin-bottom: 20px; }
  .ps-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; background: var(--color-surface-2); border: 1px solid var(--color-edge); border-radius: var(--radius-md); }
  .ps-stat-val { font-size: 15px; font-weight: 800; color: var(--color-text-1); font-variant-numeric: tabular-nums; }
  .ps-stat-key { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-3); }
  .ps-section { margin-bottom: 16px; }
  .ps-row { display: flex; gap: 8px; }
  .flex-1 { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .ps-coming-soon { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--color-surface-2); border: 1px solid var(--color-edge); border-radius: var(--radius-md); font-size: 12px; color: var(--color-text-3); }
  .ps-feedback { display: flex; align-items: center; gap: 8px; text-decoration: none; }
  .ps-delete-confirm { display: flex; flex-direction: column; gap: 8px; }
  .ps-delete-warning { font-size: 12px; color: var(--color-critical); text-align: center; padding: 8px; }
  .w-full { width: 100%; }
  .backdrop-dismiss {
  position: absolute; inset: 0; width: 100%; height: 100%;
  background: none; border: none; cursor: pointer; z-index: 0;
}
.ps-sheet { position: relative; z-index: 1; }
</style>