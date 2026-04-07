<script>
  import { char }        from '$lib/stores/profile.js';
  import { logs }        from '$lib/stores/logs.js';
  import { activeSession, timerSecs, startTimer, stopTimer } from '$lib/stores/timer.js';
  import { todayLogs, todayMin, goalPct, isRestDay, todayStr } from '$lib/stores/derived.js';

  // ── Ring geometry ─────────────────────────────────────────────────────
  const R = 108, CX = 140, CY = 140;
  const CIRC = +(2 * Math.PI * R).toFixed(4);
  let dashOffset = $derived(+(CIRC * (1 - Math.min($goalPct / 100, 1))).toFixed(4));
  let isGoalMet  = $derived($goalPct >= 100);

  // ── Celebration (fires once when crossing 100%) ───────────────────────
  let prevPct          = $state(0);
  let showCelebration  = $state(false);
  $effect(() => {
    const cur = $goalPct;
    if (cur >= 100 && prevPct < 100) {
      showCelebration = true;
      setTimeout(() => { showCelebration = false; }, 3000);
    }
    prevPct = cur;
  });

  // ── Helpers ───────────────────────────────────────────────────────────
  const p   = n => String(n).padStart(2, '0');
  function fmtLive(secs) {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${p(h)}:${p(m)}:${p(s)}`;
    if (h > 0) return `${p(h)}:${p(m)}:${p(s)}`;
    return `${p(m)}:${p(s)}`;
  }
  function fmtMin(m) {
    if (!m) return '0m';
    const h = Math.floor(m / 60), r = m % 60;
    return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m}m`;
  }
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  // ── Method groups ─────────────────────────────────────────────────────
  const BASE_GROUPS = [
    { id: 'devices',   label: 'Devices',   icon: '⚙',
      methods: [
        { id: 'tugger', label: 'Tugger' }, { id: 'dtr', label: 'DTR' },
        { id: 'cat2q', label: 'CAT II Q' }, { id: 'pud', label: 'PUD' },
        { id: 'tlc', label: 'TLC Tugger' }, { id: 'dual', label: 'Dual Restorer' },
      ]
    },
    { id: 'inflation', label: 'Inflation', icon: '◎',
      methods: [{ id: 'inflation', label: 'Inflation' }]
    },
    { id: 'packing',   label: 'Packing',   icon: '▣',
      methods: [{ id: 'packing', label: 'Packing' }]
    },
    { id: 'manual',    label: 'Manual',    icon: '✦',
      methods: [
        { id: 'm1', label: 'M1' }, { id: 'm2', label: 'M2' },
        { id: 'm3', label: 'M3' }, { id: 'm4', label: 'M4' },
        { id: 'm5', label: 'M5' },
      ]
    },
    { id: 'other', label: 'Other / Custom', icon: '✴', methods: [] },
  ];

  let groups = $derived(BASE_GROUPS.map(g => ({
    ...g,
    methods: [...g.methods, ...($char.customMethods ?? []).filter(m => m.groupId === g.id)],
  })));

  // ── UI state ──────────────────────────────────────────────────────────
  let showMethodSheet  = $state(false);
  let showSessionSheet = $state(false);
  let sessionSaved     = $state(false);
  let showGoalEditor   = $state(false);
  let showEditTime     = $state(false);
  let selectedMethod   = $state(null);
  let expandedGroup    = $state('devices');
  let addingToGroup    = $state(null);
  let newMethodName    = $state('');
  let editTimeValue    = $state('');
  let editGoalValue    = $state('');

  // ── Ring tap ──────────────────────────────────────────────────────────
  function onRingTap() {
    if ($activeSession) {
      const d = new Date($activeSession.startTs);
      editTimeValue = `${p(d.getHours())}:${p(d.getMinutes())}`;
      showSessionSheet = true;
    } else if (!$isRestDay) {
      showMethodSheet = true;
    }
  }

  // ── Session lifecycle ─────────────────────────────────────────────────
  function handleStart() {
    if (!selectedMethod) return;
    startTimer({ method: selectedMethod.id, methodLabel: selectedMethod.label, category: 'active' });
    showMethodSheet = false;
    selectedMethod = null;
  }

function handleStop() {
    const session = stopTimer();
    if (!session) return;
    const dur = Math.max(1, Math.round((Date.now() - session.startTs) / 60000));
    logs.add({
      id: crypto.randomUUID(), date: todayStr(),
      startTs: session.startTs, endTs: Date.now(), dur,
      method: session.method, methodLabel: session.methodLabel ?? session.method,
      category: 'active', tension: 'med', notes: '', isRest: false,
    });
    bumpStreak(dur);
    sessionSaved = true;
  }

  function applyEditTime() {
    if (!editTimeValue || !$activeSession) return;
    const [hh, mm] = editTimeValue.split(':').map(Number);
    const now = new Date();
    const newTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0).getTime();
    if (newTs > Date.now()) return;
    activeSession.update(s => ({ ...s, startTs: newTs }));
    timerSecs.set(Math.floor((Date.now() - newTs) / 1000));
    showEditTime = false;
  }

  function bumpStreak(dur) {
    char.update(c => {
      const today = todayStr();
      if (c.lastSessionDate === today) {
        return { ...c, totalMinutes: c.totalMinutes + dur, totalSessions: c.totalSessions + 1 };
      }
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yStr = yest.toISOString().slice(0, 10);
      const streak = c.lastSessionDate === yStr ? c.streak + 1 : 1;
      return {
        ...c,
        totalMinutes: c.totalMinutes + dur,
        totalSessions: c.totalSessions + 1,
        streak, longestStreak: Math.max(c.longestStreak, streak),
        lastSessionDate: today,
      };
    });
  }

  function markRestDay() {
    if ($isRestDay) return;
    const today = todayStr();
    logs.add({ id: crypto.randomUUID(), date: today, isRest: true, dur: 0 });
    // Maintain streak — rest day counts as "present"
    char.update(c => {
      if (c.lastSessionDate === today) return c;
      return { ...c, lastSessionDate: today };
    });
  }

  // ── Goal editor ───────────────────────────────────────────────────────
  function openGoalEditor() {
    editGoalValue = String($char.dailyGoalMin ?? 480);
    showGoalEditor = true;
  }
  function saveGoal() {
    const v = parseInt(editGoalValue);
    if (!isNaN(v) && v >= 1) char.update(c => ({ ...c, dailyGoalMin: v }));
    showGoalEditor = false;
  }

  // ── Custom method ──────────────────────────────────────────────────────
  function addCustomMethod() {
    if (!newMethodName.trim() || !addingToGroup) return;
    char.update(c => ({
      ...c,
      customMethods: [...(c.customMethods ?? []), {
        id: `custom_${Date.now()}`, label: newMethodName.trim(), groupId: addingToGroup,
      }],
    }));
    newMethodName = ''; addingToGroup = null;
  }

  // ── Ring center display ───────────────────────────────────────────────
  let ringMainText = $derived(
    $activeSession ? fmtLive($timerSecs) :
    $todayMin > 0  ? fmtMin($todayMin)   : ''
  );
let ringSubText = $derived(
    $activeSession ? ($activeSession.methodLabel ?? $activeSession.method) :
    isGoalMet      ? '🎯 Goal Reached'  :
    $todayMin > 0  ? `${$goalPct}% of goal` : ''
  );
  let showCTA = $derived(!$activeSession && $todayMin === 0);
</script>

<!-- ── Celebration burst ─────────────────────────────────────────────── -->
{#if showCelebration}
  <div class="celebration" aria-hidden="true">
    <div class="cel-ring r1"></div>
    <div class="cel-ring r2"></div>
    <div class="cel-ring r3"></div>
    <span class="cel-emoji">🎯</span>
  </div>
{/if}

<!-- ── Top row: greeting + streak ────────────────────────────────────── -->
<div class="top-row">
  <div class="greeting">
    {greeting()}, <strong>{$char.name ?? 'Restorer'}</strong>
  </div>
  <div class="streak-chip" class:lit={($char.streak ?? 0) > 0}>
    🔥 <span class="streak-num">{$char.streak ?? 0}</span>
  </div>
</div>

<!-- ── Hero Ring ─────────────────────────────────────────────────────── -->
<div class="ring-stage">
  <button class="ring-btn" onclick={onRingTap} aria-label="Open session controls">
    {#if $activeSession}
      <div class="ring-pulse" aria-hidden="true"></div>
    {/if}

    <svg width="280" height="280" viewBox="0 0 280 280" overflow="visible" aria-hidden="true">
      <defs>
        <linearGradient id="gNormal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="var(--color-accent-lo)"/>
          <stop offset="100%" stop-color="var(--color-accent-hi)"/>
        </linearGradient>
        <linearGradient id="gGoal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="var(--color-ci-lo)"/>
          <stop offset="100%" stop-color="var(--color-ci-hi)"/>
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Dashed outer accent ring -->
      <circle cx={CX} cy={CY} r={R + 18}
        fill="none" stroke="var(--color-edge)"
        stroke-width="1" stroke-dasharray="3 9" opacity="0.5"
      />

      <!-- Track -->
      <circle cx={CX} cy={CY} r={R}
        fill="none" stroke="var(--color-edge)" stroke-width="14" stroke-linecap="round"
      />

      <!-- Progress arc -->
      <circle cx={CX} cy={CY} r={R}
        fill="none"
        stroke={isGoalMet ? 'url(#gGoal)' : 'url(#gNormal)'}
        stroke-width="14" stroke-linecap="round"
        stroke-dasharray={CIRC}
        stroke-dashoffset={dashOffset}
        transform={`rotate(-90 ${CX} ${CY})`}
        filter={$activeSession ? 'url(#glow)' : ''}
        style="transition: stroke-dashoffset 700ms cubic-bezier(0.34,1.56,0.64,1), stroke 500ms ease"
      />

      <!-- Center: CTA (idle + no progress) -->
      {#if showCTA}
        <text x={CX} y={CY + 10} text-anchor="middle" class="rc-cta-main">Start</text>
        <text x={CX} y={CY + 34} text-anchor="middle" class="rc-cta-top">restoring</text>

      <!-- Center: active timer -->
      {:else if $activeSession}
        <text x={CX} y={CY + 8} text-anchor="middle" class="rc-timer">{ringMainText}</text>

      <!-- Center: today's total -->
      {:else}
        <text x={CX} y={CY + 10} text-anchor="middle" class="rc-total">{ringMainText}</text>
      {/if}

      <!-- Sub-label -->
      <text x={CX} y={CY + 44} text-anchor="middle" class="rc-sub">{ringSubText}</text>
    </svg>
  </button>
</div>

<!-- ── Goal strip ─────────────────────────────────────────────────────── -->
<div class="goal-strip">
  <div class="goal-top-row">
    <span class="goal-caption">DAILY GOAL</span>
    <button class="goal-edit-btn" onclick={openGoalEditor}>
      {fmtMin($char.dailyGoalMin ?? 480)}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
      </svg>
    </button>
  </div>
  <div class="goal-bar-track">
    <div class="goal-bar-fill" style="width: {Math.min($goalPct, 100)}%"
      class:goal-bar-done={isGoalMet}
    ></div>
  </div>
  <div class="goal-bottom-row">
    <span class="goal-done-text">{fmtMin($todayMin)} logged</span>
    <span class="goal-left-text">
      {isGoalMet ? 'Complete ✓' : `${fmtMin(Math.max(0, ($char.dailyGoalMin ?? 480) - $todayMin))} remaining`}
    </span>
  </div>
</div>

<!-- ── Rest day ───────────────────────────────────────────────────────── -->
{#if $isRestDay}
  <div class="rest-notice">🛌 Rest day — streak protected</div>
{:else if !$activeSession}
  <div class="lower-actions">
    <button class="btn-rest-day" onclick={markRestDay}>🛌 Log Rest Day</button>
  </div>
{/if}

<!-- ── Today's sessions ───────────────────────────────────────────────── -->
{#if $todayLogs.length > 0}
  <div class="today-log">
    <p class="section-label">Today's Sessions</p>
    {#each $todayLogs as entry (entry.id)}
      <div class="log-row animate-slide-up">
        <div class="log-left">
          <span class="log-dot"></span>
          <span class="log-method">{entry.methodLabel ?? entry.method}</span>
        </div>
        <span class="log-dur">{fmtMin(entry.dur)}</span>
      </div>
    {/each}
  </div>
{/if}


<!-- ════════════════════════════════════════════════════════════════════ -->
<!-- SHEET — Method Picker ─────────────────────────────────────────────── -->
{#if showMethodSheet}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Method picker">
    <button class="backdrop-dismiss" onclick={() => showMethodSheet = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Choose Method</h2>

      <div class="method-groups">
        {#each groups as group}
          <div class="mgroup" class:mgroup-open={expandedGroup === group.id}>
            <button class="mgroup-hdr"
              onclick={() => expandedGroup = expandedGroup === group.id ? null : group.id}
            >
              <span class="mgroup-icon">{group.icon}</span>
              <span class="mgroup-label">{group.label}</span>
              {#if group.methods.length > 0}
                <span class="mgroup-count">{group.methods.length}</span>
              {/if}
              <svg class="mgroup-chevron"
                style="transform: rotate({expandedGroup === group.id ? 180 : 0}deg)"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {#if expandedGroup === group.id}
              <div class="mpills animate-fade-in">
                {#each group.methods as m}
                  <button class="mpill" class:mpill-selected={selectedMethod?.id === m.id}
                    onclick={() => selectedMethod = m}
                  >{m.label}</button>
                {/each}

                {#if addingToGroup === group.id}
                  <div class="madd-row">
                    <input class="input-field madd-input" bind:value={newMethodName}
                      placeholder="Method name…"
                      onkeydown={e => e.key === 'Enter' && addCustomMethod()}
                    />
                    <button class="madd-confirm" onclick={addCustomMethod}>Add</button>
                  </div>
                {:else}
                  <button class="mpill mpill-add"
                    onclick={() => { addingToGroup = group.id; newMethodName = ''; }}
                  >+ Add</button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <button class="btn-primary" style="margin-top:20px"
        disabled={!selectedMethod} onclick={handleStart}
      >
        ▶ Start — {selectedMethod?.label ?? 'select a method above'}
      </button>
      <button class="btn-ghost" style="margin-top:8px" onclick={() => { showMethodSheet = false; selectedMethod = null; }}>
        Cancel
      </button>
    </div>
  </div>
{/if}


<!-- ════════════════════════════════════════════════════════════════════ -->
<!-- SHEET — Active Session ───────────────────────────────────────────── -->
{#if showSessionSheet}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Active session">
    <button class="backdrop-dismiss" onclick={() => showSessionSheet = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Live Session</h2>

      <div class="session-card surface-violet">
        <div class="scard-row">
          <span class="scard-label">METHOD</span>
          <span class="scard-val">{$activeSession?.methodLabel ?? $activeSession?.method}</span>
        </div>
        <div class="divider"></div>
        <div class="scard-row">
          <span class="scard-label">ELAPSED</span>
          <span class="scard-val tabular" style="color:var(--color-accent)">{fmtLive($timerSecs)}</span>
        </div>
        <div class="divider"></div>
        <div class="scard-row">
          <span class="scard-label">STARTED</span>
          <span class="scard-val">
            {$activeSession
              ? new Date($activeSession.startTs).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
              : '—'}
          </span>
        </div>
      </div>

      <!-- Adjust start time -->
      <div class="time-edit-block">
        <p class="time-edit-hint">Forgot to start on time? Adjust it below.</p>
        {#if showEditTime}
          <div class="time-edit-row">
            <input type="time" class="input-field" bind:value={editTimeValue} />
            <button class="btn-apply" onclick={applyEditTime}>Apply</button>
            <button class="btn-x" onclick={() => showEditTime = false}>✕</button>
          </div>
        {:else}
          <button class="btn-ghost w-full" onclick={() => showEditTime = true}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Edit Start Time
          </button>
        {/if}
      </div>

      {#if !sessionSaved}
        <button class="btn-ghost" style="margin-top:8px; margin-bottom:8px" onclick={() => showSessionSheet = false}>
          Keep Running
        </button>
        <button class="btn-primary btn-stop" onclick={handleStop}>⏹ Stop &amp; Save</button>
      {:else}
        <div class="save-confirm-wrap">
          <span class="save-check">✓</span>
          <p class="save-confirm-text">Session Saved!</p>
        </div>
        <button class="btn-primary" style="margin-top:20px"
          onclick={() => { showSessionSheet = false; sessionSaved = false; }}
        >
          Back to Home
        </button>
      {/if}
    </div>
  </div>
{/if}


<!-- ════════════════════════════════════════════════════════════════════ -->
<!-- SHEET — Goal Editor ──────────────────────────────────────────────── -->
{#if showGoalEditor}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Goal editor">
    <button class="backdrop-dismiss" onclick={() => showGoalEditor = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Daily Goal</h2>
      <p class="sheet-hint">Your Time Under Tension target, in minutes.</p>

      <div class="goal-input-wrap">
        <input type="number" class="input-field goal-num-input"
          bind:value={editGoalValue} min="1" max="1440" placeholder="480"
        />
        <span class="goal-unit">min</span>
      </div>

      <div class="presets">
        {#each [60,120,240,360,480,600,720] as pre}
          <button class="preset-btn" class:preset-sel={editGoalValue === String(pre)}
            onclick={() => editGoalValue = String(pre)}
          >{fmtMin(pre)}</button>
        {/each}
      </div>

      <button class="btn-primary" style="margin-top:24px" onclick={saveGoal}>Save Goal</button>
      <button class="btn-ghost"   style="margin-top:8px"  onclick={() => showGoalEditor = false}>Cancel</button>
    </div>
  </div>
{/if}


<style>
/* ── Top row ──────────────────────────────────────────────────────────── */
.top-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 0 8px;
}
.greeting { font-size: 13px; color: var(--color-text-3); }
.greeting strong { color: var(--color-text-1); font-weight: 700; }

.streak-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-edge);
  border-radius: var(--radius-pill);
  font-size: 13px;
  transition: all 200ms;
}
.streak-chip.lit {
  background: oklch(75% 0.19 55 / 0.1);
  border-color: oklch(75% 0.19 55 / 0.35);
}
.streak-num { font-size: 15px; font-weight: 800; color: var(--color-text-1); font-variant-numeric: tabular-nums; }

/* ── Ring ─────────────────────────────────────────────────────────────── */
.ring-stage {
  display: flex; justify-content: center; align-items: center;
  padding: 4px 0;
}
.ring-btn {
  background: none; border: none; cursor: pointer; padding: 0;
  border-radius: 50%; position: relative;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: transform 120ms var(--ease-spring);
}
.ring-btn:active { transform: scale(0.97); }

.ring-pulse {
  position: absolute; inset: 20px; border-radius: 50%;
  pointer-events: none;
  animation: rpulse 2.2s ease-in-out infinite;
}
@keyframes rpulse {
  0%,100% { box-shadow: 0 0 0 0  oklch(72% 0.22 292 / 0.4); }
  50%      { box-shadow: 0 0 0 22px oklch(72% 0.22 292 / 0); }
}

/* SVG text — must be :global since they're inside an SVG */
:global(.rc-cta-top)  { font: 600 16px 'Inter Variable',sans-serif; fill: var(--color-text-3); }
:global(.rc-cta-main) { font: 800 34px 'Inter Variable',sans-serif; fill: var(--color-text-1); }
:global(.rc-timer)    { font: 800 28px 'Inter Variable',sans-serif; fill: var(--color-accent);  font-variant-numeric: tabular-nums; }
:global(.rc-total)    { font: 800 34px 'Inter Variable',sans-serif; fill: var(--color-text-1);  font-variant-numeric: tabular-nums; }
:global(.rc-sub)      { font: 600 11px 'Inter Variable',sans-serif; fill: var(--color-text-3);  letter-spacing: 0.04em; }

/* ── Goal strip ───────────────────────────────────────────────────────── */
.goal-strip { padding: 0 2px; margin-bottom: 16px; }
.goal-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.goal-caption { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: var(--color-text-3); }
.goal-edit-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 12px;
  background: var(--color-accent-tint); border: 1px solid var(--color-accent-ring);
  border-radius: var(--radius-pill); cursor: pointer;
  font-size: 11px; font-weight: 700; color: var(--color-accent);
  transition: background 150ms;
}
.goal-edit-btn:hover { background: var(--color-accent-dim); }
.goal-bar-track {
  height: 5px; background: var(--color-edge); border-radius: var(--radius-pill); overflow: hidden;
  margin-bottom: 6px;
}
.goal-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent-lo), var(--color-accent-hi));
  border-radius: var(--radius-pill);
  transition: width 700ms cubic-bezier(0.34,1.56,0.64,1);
}
.goal-bar-done { background: linear-gradient(90deg, var(--color-ci-lo), var(--color-ci-hi)); }
.goal-bottom-row { display: flex; justify-content: space-between; }
.goal-done-text, .goal-left-text { font-size: 11px; color: var(--color-text-3); font-variant-numeric: tabular-nums; }

/* ── Lower actions ────────────────────────────────────────────────────── */
.lower-actions { margin-bottom: 4px; }
.btn-rest-day {
  padding: 10px 20px;
  background: var(--color-surface-2); border: 1px solid var(--color-edge);
  border-radius: var(--radius-pill); color: var(--color-text-3);
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all 150ms;
}
.btn-rest-day:hover { border-color: var(--color-accent-ring); color: var(--color-text-2); background: var(--color-accent-tint); }
.rest-notice {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: var(--color-surface-2);
  border-radius: var(--radius-lg); font-size: 13px; color: var(--color-text-2);
  margin-bottom: 4px;
}

/* ── Today log ────────────────────────────────────────────────────────── */
.today-log { margin-top: 20px; }
.log-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; margin-bottom: 6px;
  background: var(--color-surface-1); border: 1px solid var(--color-edge);
  border-radius: var(--radius-md);
}
.log-left { display: flex; align-items: center; gap: 10px; }
.log-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 6px var(--color-accent-glow); flex-shrink: 0; }
.log-method { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.log-dur { font-size: 13px; font-weight: 700; color: var(--color-accent); font-variant-numeric: tabular-nums; }

/* ── Shared sheet backdrop ────────────────────────────────────────────── */
.sheet-backdrop {
  position: fixed; inset: 0; background: oklch(0% 0 0 / 0.75);
  backdrop-filter: blur(4px); z-index: 50;
  display: flex; align-items: flex-end; justify-content: center;
  max-width: 480px; margin: 0 auto;
}
.sheet-title {
  font-family: var(--font-display); font-size: 18px; font-weight: 700;
  color: var(--color-text-1); text-align: center; margin-bottom: 20px;
}
.sheet-hint { font-size: 12px; color: var(--color-text-3); text-align: center; margin-bottom: 16px; }

/* ── Method picker internals ──────────────────────────────────────────── */
.method-groups { display: flex; flex-direction: column; gap: 4px; }
.mgroup { background: var(--color-surface-2); border: 1px solid var(--color-edge); border-radius: var(--radius-md); overflow: hidden; }
.mgroup-open { border-color: var(--color-accent-ring); }
.mgroup-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 13px 14px; background: none; border: none; cursor: pointer;
  width: 100%; text-align: left; color: var(--color-text-2);
  transition: color 150ms;
}
.mgroup-hdr:hover { color: var(--color-text-1); }
.mgroup-icon { font-size: 14px; flex-shrink: 0; }
.mgroup-label { font-size: 13px; font-weight: 700; flex: 1; }
.mgroup-count { font-size: 10px; padding: 2px 7px; background: var(--color-edge); border-radius: var(--radius-pill); color: var(--color-text-3); }
.mgroup-chevron { flex-shrink: 0; transition: transform 220ms var(--ease-out-expo); color: var(--color-text-4); }
.mpills { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 14px; }
.mpill {
  padding: 7px 15px; background: var(--color-surface-3);
  border: 1px solid var(--color-edge); border-radius: var(--radius-pill);
  font-size: 12px; font-weight: 600; color: var(--color-text-2); cursor: pointer;
  transition: all 150ms;
}
.mpill:hover:not(.mpill-selected) { border-color: var(--color-accent-ring); color: var(--color-text-1); }
.mpill-selected { background: var(--color-accent-tint); border-color: var(--color-accent-ring); color: var(--color-accent); box-shadow: 0 0 12px var(--color-accent-dim); }
.mpill-add { background: transparent; border-style: dashed; color: var(--color-text-4); }
.mpill-add:hover { color: var(--color-text-2); border-color: var(--color-accent-ring); border-style: dashed; }
.madd-row { display: flex; gap: 6px; width: 100%; }
.madd-input { font-size: 12px; padding: 7px 10px; flex: 1; }
.madd-confirm { padding: 7px 14px; background: var(--color-accent); border: none; border-radius: var(--radius-pill); color: var(--color-base); font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }

/* ── Session card ─────────────────────────────────────────────────────── */
.session-card { padding: 4px 16px; margin-bottom: 16px; }
.scard-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; }
.scard-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: var(--color-text-3); }
.scard-val { font-size: 14px; font-weight: 700; color: var(--color-text-1); }
.time-edit-block { margin-bottom: 16px; }
.time-edit-hint { font-size: 11px; color: var(--color-text-3); margin-bottom: 8px; }
.time-edit-row { display: flex; gap: 6px; align-items: center; }
.btn-apply { padding: 10px 16px; background: var(--color-accent); border: none; border-radius: var(--radius-md); color: var(--color-base); font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.btn-x { padding: 10px 12px; background: var(--color-surface-2); border: 1px solid var(--color-edge); border-radius: var(--radius-md); color: var(--color-text-3); font-size: 12px; cursor: pointer; }
.w-full { width: 100%; }
.btn-stop { background: linear-gradient(135deg, oklch(30% 0.15 25), var(--color-critical)); }

/* ── Goal editor internals ────────────────────────────────────────────── */
.goal-input-wrap { position: relative; display: flex; align-items: center; margin-bottom: 16px; }
.goal-num-input { font-size: 28px; font-weight: 800; text-align: center; padding: 16px 52px 16px 16px; font-variant-numeric: tabular-nums; }
.goal-unit { position: absolute; right: 14px; font-size: 14px; font-weight: 600; color: var(--color-text-3); }
.presets { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.preset-btn { padding: 6px 14px; background: var(--color-surface-2); border: 1px solid var(--color-edge); border-radius: var(--radius-pill); font-size: 12px; font-weight: 600; color: var(--color-text-2); cursor: pointer; transition: all 150ms; }
.preset-sel { background: var(--color-accent-tint); border-color: var(--color-accent-ring); color: var(--color-accent); }

/* ── Celebration ──────────────────────────────────────────────────────── */
.celebration {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.cel-ring {
  position: absolute; border-radius: 50%;
  border: 2px solid var(--color-ci);
  width: 200px; height: 200px;
  animation: cel-expand 1.6s var(--ease-out-expo) forwards;
}
.r1 { animation-delay: 0ms; }
.r2 { animation-delay: 180ms; }
.r3 { animation-delay: 360ms; }
@keyframes cel-expand {
  0%   { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(3.5); opacity: 0; }
}
.cel-emoji { font-size: 52px; animation: cel-pop 600ms var(--ease-spring) both; filter: drop-shadow(0 0 20px var(--color-ci)); }
@keyframes cel-pop {
  0%  { transform: scale(0) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.3) rotate(6deg); }
  100%{ transform: scale(1)   rotate(0deg); opacity: 1; }
}
.backdrop-dismiss {
  position: absolute; inset: 0; width: 100%; height: 100%;
  background: none; border: none; cursor: pointer; z-index: 0;
}
.sheet { position: relative; z-index: 1; }
/* Arc idle state */
  .arc-start {
    font-size: 40px;
    font-family: var(--font-display);
    font-weight: 900;
    fill: var(--color-accent);
  }
  .arc-cta {
    font-size: 13px;
    fill: var(--color-text-3);
    font-family: var(--font-sans);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .save-confirm-wrap {
    display: flex; flex-direction: column; align-items: center;
    gap: 8px; padding: 16px 0 8px;
  }
  .save-check {
    font-size: 48px; color: var(--color-positive);
    line-height: 1;
  }
  .save-confirm-text {
    font-size: 18px; font-weight: 700;
    color: var(--color-text-1);
    font-family: var(--font-display);
  }
</style>