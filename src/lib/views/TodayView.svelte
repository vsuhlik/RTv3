<script>
  import { char }         from '$lib/stores/profile.js';
  import { logs }         from '$lib/stores/logs.js';
  import { activeSession, timerSecs, startTimer, stopTimer, fmtTimer } from '$lib/stores/timer.js';
  import { todayLogs, todayMin, goalPct, isRestDay, minRemaining } from '$lib/stores/derived.js';
  import { todayStr }     from '$lib/stores/derived.js';

  // ── Arc maths ────────────────────────────────────────────────────────────
  const R   = 88;                              // arc radius
  const CX  = 110; const CY = 110;            // center of the SVG viewport
  const CIRC = 2 * Math.PI * R;               // full circumference

  // How much of the arc to fill (0 → full circle)
  let dashOffset = $derived(CIRC * (1 - ($goalPct / 100)));

  // ── Formatting helpers ───────────────────────────────────────────────────
  function fmtMin(m) {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }

  function methodLabel(m) {
    const MAP = {
      manual: 'Manual', dtc: 'DTC', tlc: 'TLC',
      tape: 'Tape', device: 'Device', other: 'Other',
    };
    return MAP[m] ?? m;
  }

  // ── Session actions ──────────────────────────────────────────────────────
  let showStartSheet = $state(false);
  let pendingMethod  = $state('manual');

  function handleStart() {
    startTimer({ method: pendingMethod, category: 'active' });
    showStartSheet = false;
  }

  function handleStop() {
    const session = stopTimer();
    if (!session) return;

    const dur = Math.max(1, Math.round((Date.now() - session.startTs) / 60000));
    const entry = {
      id:       crypto.randomUUID(),
      date:     todayStr(),
      startTs:  session.startTs,
      endTs:    Date.now(),
      dur,
      method:   session.method,
      category: session.category ?? 'active',
      tension:  'med',
      notes:    '',
      isRest:   false,
    };

    logs.add(entry);
    char.update(c => ({
      ...c,
      totalMinutes:  c.totalMinutes  + dur,
      totalSessions: c.totalSessions + 1,
      lastSessionDate: todayStr(),
    }));
  }

  function markRestDay() {
    if ($isRestDay) return;
    logs.add({
      id:     crypto.randomUUID(),
      date:   todayStr(),
      isRest: true,
      dur:    0,
    });
  }

  const METHODS = [
    { id: 'manual',  label: 'Manual',  emoji: '✋' },
    { id: 'dtc',     label: 'DTC',     emoji: '🔵' },
    { id: 'tlc',     label: 'TLC',     emoji: '🟡' },
    { id: 'tape',    label: 'Tape',    emoji: '🩹' },
    { id: 'device',  label: 'Device',  emoji: '⚙️' },
  ];
</script>

<!-- ── ACTIVE TIMER BANNER ──────────────────────────────────────────────── -->
{#if $activeSession}
  <div class="timer-banner">
    <div class="timer-left">
      <span class="live-dot"></span>
      <div>
        <div class="timer-label">Active — {methodLabel($activeSession.method)}</div>
        <div class="timer-time tabular">{fmtTimer($timerSecs)}</div>
      </div>
    </div>
    <button class="btn-stop" onclick={handleStop}>Stop &amp; Save</button>
  </div>
{/if}

<!-- ── HERO ARC ─────────────────────────────────────────────────────────── -->
<div class="hero-arc-wrap">
  <svg width="220" height="220" viewBox="0 0 220 220" class="hero-arc" aria-hidden="true">
    <!-- Track ring -->
    <circle
      cx={CX} cy={CY} r={R}
      fill="none"
      stroke="var(--color-edge)"
      stroke-width="10"
    />
    <!-- Progress ring -->
    <circle
      cx={CX} cy={CY} r={R}
      fill="none"
      stroke="url(#arcGrad)"
      stroke-width="10"
      stroke-linecap="round"
      stroke-dasharray={CIRC}
      stroke-dashoffset={dashOffset}
      transform="rotate(-90 {CX} {CY})"
      style="transition: stroke-dashoffset 600ms cubic-bezier(0.34,1.56,0.64,1)"
    />
    <defs>
      <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="var(--color-accent-lo)" />
        <stop offset="100%" stop-color="var(--color-accent-hi)" />
      </linearGradient>
    </defs>
    <!-- Center text -->
    <text x={CX} y={CY - 10} text-anchor="middle" class="arc-value">{$todayMin}</text>
    <text x={CX} y={CY + 14} text-anchor="middle" class="arc-unit">min today</text>
    <text x={CX} y={CY + 34} text-anchor="middle" class="arc-pct">{$goalPct}%</text>
  </svg>

  <!-- Goal label beneath arc -->
  <div class="goal-meta">
    {#if $goalPct >= 100}
      <span class="pill pill-positive">🎯 Daily goal reached</span>
    {:else}
      <span class="goal-remaining">{fmtMin($minRemaining)} to goal</span>
    {/if}
  </div>
</div>

<!-- ── SESSION ACTIONS ──────────────────────────────────────────────────── -->
{#if !$activeSession && !$isRestDay}
  <div class="actions-block">
    <button class="btn-primary" onclick={() => showStartSheet = true}>
      ▶ Start Session
    </button>
    <div class="action-row">
      <button class="btn-ghost" onclick={markRestDay}>🛌 Rest Day</button>
    </div>
  </div>
{:else if $isRestDay}
  <div class="rest-notice">
    <span>🛌</span>
    <span>Rest day logged — recovery is progress.</span>
  </div>
{/if}

<!-- ── TODAY'S LOG ──────────────────────────────────────────────────────── -->
{#if $todayLogs.length > 0}
  <div class="session-list">
    <p class="section-label">Today's Sessions</p>
    {#each $todayLogs as entry (entry.id)}
      <div class="session-row surface-card animate-slide-up">
        <div class="session-method">{methodLabel(entry.method)}</div>
        <div class="session-dur tabular">{fmtMin(entry.dur)}</div>
      </div>
    {/each}
  </div>
{/if}

<!-- ── START SESSION SHEET ──────────────────────────────────────────────── -->
{#if showStartSheet}
  <div class="overlay-backdrop" role="dialog" aria-modal="true">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Choose Method</h2>
      <div class="method-grid">
        {#each METHODS as m}
          <button
            class="method-btn"
            class:selected={pendingMethod === m.id}
            onclick={() => pendingMethod = m.id}
          >
            <span class="method-emoji">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        {/each}
      </div>
      <button class="btn-primary" style="margin-top: 20px" onclick={handleStart}>
        ▶ Start Timer
      </button>
      <button class="btn-ghost" style="margin-top: 8px" onclick={() => showStartSheet = false}>
        Cancel
      </button>
    </div>
  </div>
{/if}

<style>
  /* ── Active timer banner ─────────────────────────────────────────────── */
  .timer-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-surface-2);
    border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-lg);
    padding: 12px 16px;
    margin-bottom: 12px;
    animation: slide-up 240ms var(--ease-out-expo) both;
  }
  .timer-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .timer-label {
    font-size: 11px;
    color: var(--color-text-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .timer-time {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--color-accent);
    line-height: 1;
    margin-top: 2px;
  }
  .btn-stop {
    background: var(--color-accent);
    color: var(--color-base);
    border: none;
    border-radius: var(--radius-md);
    padding: 9px 16px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 150ms;
    white-space: nowrap;
  }
  .btn-stop:active { opacity: 0.8; }

  /* ── Hero arc ────────────────────────────────────────────────────────── */
  .hero-arc-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 4px;
  }
  .hero-arc { overflow: visible; }

  .arc-value {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 900;
    fill: var(--color-text-1);
    font-variant-numeric: tabular-nums;
  }
  .arc-unit {
    font-size: 11px;
    fill: var(--color-text-3);
    font-family: var(--font-sans);
    font-weight: 500;
    letter-spacing: 0.04em;
  }
  .arc-pct {
    font-size: 12px;
    fill: var(--color-accent);
    font-family: var(--font-sans);
    font-weight: 700;
  }

  .goal-meta {
    margin-top: 4px;
    min-height: 24px;
    display: flex;
    align-items: center;
  }
  .goal-remaining {
    font-size: 12px;
    color: var(--color-text-3);
    font-weight: 500;
  }

  /* ── Actions ────────────────────────────────────────────────────────── */
  .actions-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }
  .action-row {
    display: flex;
    gap: 8px;
  }
  .action-row > * { flex: 1; }

  .rest-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: var(--color-surface-2);
    border-radius: var(--radius-lg);
    font-size: 13px;
    color: var(--color-text-2);
    margin-top: 4px;
  }

  /* ── Session log ─────────────────────────────────────────────────────── */
  .session-list {
    margin-top: 20px;
  }
  .session-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    margin-bottom: 6px;
  }
  .session-method {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-1);
  }
  .session-dur {
    font-size: 13px;
    color: var(--color-accent);
    font-weight: 700;
  }

  /* ── Sheet internals ─────────────────────────────────────────────────── */
  .sheet-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-1);
    text-align: center;
    margin-bottom: 20px;
  }
  .method-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .method-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-edge);
    border-radius: var(--radius-md);
    color: var(--color-text-2);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 150ms, background 150ms, color 150ms;
  }
  .method-btn.selected {
    border-color: var(--color-accent);
    background: var(--color-accent-tint);
    color: var(--color-text-1);
  }
  .method-emoji { font-size: 22px; }
</style>