<script>
  import { char }  from '$lib/stores/profile.js';
  import { logs }  from '$lib/stores/logs.js';
  import { fade }  from 'svelte/transition';

  // ── CI Level definitions ───────────────────────────────────────────────
  const CI_LEVELS = [
    { level:0, short:'No coverage at rest',       detail:'Glans fully exposed at all times. This is the universal starting point.' },
    { level:1, short:'Minimal shaft coverage',    detail:'Skin bunches slightly at the base of the glans. Tension is beginning to work.' },
    { level:2, short:'Partial shaft bunching',    detail:'Skin bunches partway up the shaft when pushed forward. Progress is real.' },
    { level:3, short:'Partial flaccid coverage',  detail:'Skin begins to cover part of the glans when flaccid. A visible turning point.' },
    { level:4, short:'Full flaccid coverage',     detail:'Skin fully covers the glans at rest without assistance. A major milestone.' },
    { level:5, short:'Slight overhang',           detail:'Skin extends slightly past the glans with a small pucker. Rollover is near.' },
    { level:6, short:'Moderate overhang',         detail:'Noticeable overhang and pucker. Coverage is becoming self-sustaining.' },
    { level:7, short:'Significant overhang',      detail:'Good overhang flaccid, beginning of erect coverage. The finish line is visible.' },
    { level:8, short:'Near-complete coverage',    detail:'Most erect coverage achieved. Gliding sensation returning. Almost there.' },
    { level:9, short:'Complete natural coverage', detail:'Full coverage functionally equivalent to an intact foreskin. Goal achieved.' },
  ];

  // ~150 hrs per CI level — standard community estimate
  const MINS_PER_LEVEL = 9000;

  // ── Derived values ─────────────────────────────────────────────────────
  let ciCurrent = $derived($char.ciCurrent ?? 0);
  let ciStart   = $derived($char.ciStart   ?? 0);
  let ciGoal    = $derived($char.ciGoal    ?? 9);
  let totalTUT  = $derived($char.totalMinutes ?? 0);

  // 30-day average daily TUT (goal-counting sessions only)
  let avgDailyTUT = $derived((() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const recent = $logs.filter(l => !l.isRest && l.date >= cutoffStr && l.countTowardGoal !== false);
    if (!recent.length) return 0;
    const mins = recent.reduce((s, l) => s + (l.dur || 0), 0);
    const days = new Set(recent.map(l => l.date)).size;
    return days > 0 ? mins / days : 0;
  })());

  // Progress through current CI level (0–100)
  let levelPct = $derived((() => {
    const levelsGained = Math.max(0, ciCurrent - ciStart);
    const minsUsedOnPastLevels = levelsGained * MINS_PER_LEVEL;
    const minsInCurrent = Math.max(0, totalTUT - minsUsedOnPastLevels);
    return Math.min(100, Math.max(0, Math.round((minsInCurrent / MINS_PER_LEVEL) * 100)));
  })());

  // Days to next CI level
  let daysToNext = $derived((() => {
    if (ciCurrent >= 9 || avgDailyTUT < 1) return null;
    const levelsGained = Math.max(0, ciCurrent - ciStart);
    const minsUsedOnPast = levelsGained * MINS_PER_LEVEL;
    const minsInCurrent  = Math.max(0, totalTUT - minsUsedOnPast);
    const minsRemaining  = Math.max(0, MINS_PER_LEVEL - (minsInCurrent % MINS_PER_LEVEL));
    return Math.ceil(minsRemaining / avgDailyTUT);
  })());

  // Estimated calendar date for next CI
  let estNextDate = $derived((() => {
    if (!daysToNext) return null;
    const d = new Date(); d.setDate(d.getDate() + daysToNext);
    return d.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  })());

  // Days since the user started restoration
  let daysSinceStart = $derived((() => {
    if (!$char.startDate) return null;
    const start = new Date($char.startDate + 'T12:00:00');
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  })());

  // Overall goal % (CI levels completed vs total needed)
  let overallGoalPct = $derived(
    ciGoal > ciStart
      ? Math.min(100, Math.round(((ciCurrent - ciStart) / (ciGoal - ciStart)) * 100))
      : 100
  );

  // ── UI state ───────────────────────────────────────────────────────────
  let showCISheet  = $state(false);
  let selectedCI   = $state(0);
  let showCeremony = $state(false);
  let ceremonyCI   = $state(0);
  let expandedLvl  = $state(/** @type {number|null} */(null));

  function openCISheet() {
    selectedCI = ciCurrent;
    showCISheet = true;
  }

  function saveCILevel() {
    if (selectedCI === ciCurrent) { showCISheet = false; return; }
    ceremonyCI = selectedCI;
    char.update(c => ({
      ...c,
      ciCurrent:    selectedCI,
      ciStart:      c.ciStart ?? selectedCI,
      lastCIUpdate: new Date().toISOString().slice(0, 10),
      startDate:    c.startDate || new Date().toISOString().slice(0, 10),
    }));
    showCISheet = false;
    setTimeout(() => {
      showCeremony = true;
      setTimeout(() => { showCeremony = false; }, 5200);
    }, 150);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function fmtMin(m) {
    if (!m || m <= 0) return '0m';
    if (m < 60) return `${Math.round(m)}m`;
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return h > 0 ? (r > 4 ? `${h}h ${r}m` : `${h}h`) : `${Math.round(m)}m`;
  }
  function fmtDays(d) {
    if (d === null || d === undefined) return '—';
    if (d < 7)   return `${d}d`;
    if (d < 30)  return `${Math.round(d / 7)}w`;
    if (d < 365) return `${Math.round(d / 30)}mo`;
    return `${(d / 365).toFixed(1)}y`;
  }
  const CIRC_R = 36;
  const CIRC   = +(2 * Math.PI * CIRC_R).toFixed(2);
</script>

<!-- ══ CI Aurora Ceremony ════════════════════════════════════════════════ -->
{#if showCeremony}
  <div
    class="ceremony-overlay"
    transition:fade={{ duration: 600 }}
    onclick={() => showCeremony = false}
    role="dialog"
    aria-modal="true"
    aria-label="CI Level reached"
  >
    <div class="aur-ring ar1" aria-hidden="true"></div>
    <div class="aur-ring ar2" aria-hidden="true"></div>
    <div class="aur-ring ar3" aria-hidden="true"></div>

    <div class="ceremony-body animate-scale-in">
      <div class="ceremony-badge">
        <span class="cbadge-label">CI</span>
        <span class="cbadge-num">{ceremonyCI}</span>
      </div>
      <h2 class="ceremony-title">Level Reached</h2>
      <p class="ceremony-msg">
        {CI_LEVELS[ceremonyCI]?.short ?? ''}.<br/>
        Your consistency built this. Keep the tension on.
      </p>
      <div class="ceremony-bar-wrap">
        <div class="ceremony-bar"></div>
      </div>
      <p class="ceremony-hint">Tap to continue</p>
    </div>
  </div>
{/if}

<!-- ══ Journey View ══════════════════════════════════════════════════════ -->
<div class="jv">

  <!-- ── CI Hero card ────────────────────────────────────────────────── -->
  <div class="surface-glass jv-hero animate-slide-up">
    <div class="hero-main">

      <!-- Left: big CI number -->
      <div class="hero-left">
        <span class="hero-sup">CURRENT LEVEL</span>
        <div class="hero-ci-row">
          <span class="hero-ci-num gradient-text-ci">{ciCurrent}</span>
          <span class="pill pill-ci" style="align-self:flex-end;margin-bottom:10px">CI-{ciCurrent}</span>
        </div>
        <span class="hero-ci-desc">{CI_LEVELS[ciCurrent]?.short ?? ''}</span>
      </div>

      <!-- Right: mini progress ring (into next level) -->
      <div class="hero-right">
        <div class="hero-ring-wrap">
          <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true">
            <circle cx="43" cy="43" r={CIRC_R} fill="none"
              stroke="var(--color-ci-lo)" stroke-width="8"/>
            <circle cx="43" cy="43" r={CIRC_R} fill="none"
              stroke="var(--color-ci)" stroke-width="8"
              stroke-linecap="round"
              stroke-dasharray={CIRC}
              stroke-dashoffset={+(CIRC * (1 - levelPct / 100)).toFixed(2)}
              transform="rotate(-90 43 43)"
              style="transition:stroke-dashoffset 900ms cubic-bezier(0.34,1.56,0.64,1)"
            />
            <text x="43" y="47" text-anchor="middle"
              style="font:800 14px 'Inter Variable',sans-serif;fill:var(--color-ci);font-variant-numeric:tabular-nums">
              {levelPct}%
            </text>
          </svg>
        </div>
        <span class="hero-ring-sub">
          {ciCurrent < 9 ? `into CI-${ciCurrent + 1}` : 'Goal reached ✓'}
        </span>
      </div>
    </div>

    <!-- Overall goal bar -->
    <div class="hero-goal-row">
      {#if ciGoal > ciCurrent}
        <span class="hero-goal-label">Goal: CI-{ciGoal}</span>
        <div class="hero-goal-track">
          <div class="hero-goal-fill" style="width:{overallGoalPct}%"></div>
        </div>
        <span class="hero-goal-pct">{overallGoalPct}%</span>
      {:else}
        <span class="hero-goal-label" style="color:var(--color-ci)">🎯 Goal Reached — CI-{ciGoal}</span>
      {/if}
    </div>
  </div>

  <!-- ── Projection card ─────────────────────────────────────────────── -->
  <div class="surface-card proj-card card-ci-top animate-slide-up">
    <span class="section-label">Projection</span>
    <div class="proj-grid">
      <div class="proj-cell">
        <span class="proj-val" style="color:var(--color-ci)">{daysToNext !== null ? fmtDays(daysToNext) : '—'}</span>
        <span class="proj-key">Est. to CI-{Math.min(9, ciCurrent + 1)}</span>
      </div>
      <div class="proj-cell">
        <span class="proj-val" style="color:var(--color-health)">{fmtMin(Math.round(avgDailyTUT))}</span>
        <span class="proj-key">30-day avg / day</span>
      </div>
      <div class="proj-cell">
        <span class="proj-val" style="color:var(--color-accent)">{daysSinceStart !== null ? fmtDays(daysSinceStart) : '—'}</span>
        <span class="proj-key">Days tracking</span>
      </div>
      <div class="proj-cell">
        <span class="proj-val" style="color:var(--color-text-1)">{fmtMin(totalTUT)}</span>
        <span class="proj-key">Total TUT</span>
      </div>
    </div>

    {#if estNextDate && daysToNext}
      <p class="proj-est-line">
        At your current rate — CI-{Math.min(9, ciCurrent + 1)} est.
        <strong style="color:var(--color-ci)">{estNextDate}</strong>
      </p>
    {:else if avgDailyTUT < 1}
      <p class="proj-est-line">Log more sessions to unlock your projection.</p>
    {/if}
    <p class="proj-disclaimer">Estimates based on ~150 hrs per CI level. Individual results vary.</p>
  </div>

  <!-- ── Journey Map ─────────────────────────────────────────────────── -->
  <div class="surface-card jmap-card animate-slide-up">
    <span class="section-label">Journey Map — CI-{ciStart} → CI-{ciGoal}</span>
    <div class="jmap">
      {#each CI_LEVELS.filter(l => l.level >= ciStart && l.level <= ciGoal) as lvl}
        {@const isPast    = lvl.level < ciCurrent}
        {@const isCurrent = lvl.level === ciCurrent}
        {@const isGoal    = lvl.level === ciGoal}
        {@const isExp     = expandedLvl === lvl.level}
        {@const isLast    = lvl.level === ciGoal}

        <div class="jmap-row"
          class:is-past={isPast}
          class:is-current={isCurrent}
          class:is-future={!isPast && !isCurrent}
        >
          <!-- Node + connector line -->
          <div class="jmap-spine">
            <div class="jmap-node"
              class:node-past={isPast}
              class:node-current={isCurrent}
              class:node-future={!isPast && !isCurrent}
            >
              {#if isPast}
                <span class="node-icon">✓</span>
              {:else if isCurrent}
                <span class="node-icon" style="font-size:9px;font-family:var(--font-display);font-weight:800">NOW</span>
              {:else}
                <span class="node-num">{lvl.level}</span>
              {/if}
            </div>
            {#if !isLast}
              <div class="jmap-line" class:line-done={isPast}></div>
            {/if}
          </div>

          <!-- Content block -->
          <button class="jmap-content" onclick={() => expandedLvl = isExp ? null : lvl.level}>
            <div class="jmap-header-row">
              <span class="jmap-ci-tag">CI-{lvl.level}</span>
              {#if isGoal}
                <span class="jmap-goal-pip">GOAL</span>
              {/if}
              <span class="jmap-short">{lvl.short}</span>
              <svg class="jmap-chev"
                style="transform:rotate({isExp ? 180 : 0}deg)"
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {#if isExp}
              <p class="jmap-detail animate-fade-in">{lvl.detail}</p>
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </div>

  <!-- ── Update CI button ────────────────────────────────────────────── -->
  <button class="btn-ci-update animate-slide-up" onclick={openCISheet}>
    <span style="font-size:18px">🏆</span>
    Log a CI Level Update
  </button>

</div>

<!-- ══ CI Update Sheet ══════════════════════════════════════════════════ -->
{#if showCISheet}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Update CI level">
    <button class="backdrop-dismiss" onclick={() => showCISheet = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up" style="padding-bottom:60px">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title-ci">Update CI Level</h2>
      <p class="sheet-hint-ci">Select your current CI level. Be honest — this is your personal record.</p>

      <div class="ci-selector">
        {#each CI_LEVELS as lvl}
          <button
            class="ci-sel-btn"
            class:ci-sel-active={selectedCI === lvl.level}
            onclick={() => selectedCI = lvl.level}
          >
            <span class="ci-sel-num">CI-{lvl.level}</span>
            <span class="ci-sel-desc">{lvl.short}</span>
            {#if selectedCI === lvl.level}
              <span class="ci-sel-check">✓</span>
            {/if}
          </button>
        {/each}
      </div>

      <button
        class="btn-ci-save"
        disabled={selectedCI === ciCurrent}
        onclick={saveCILevel}
      >
        {selectedCI === ciCurrent ? 'No change' : `Save — CI-${selectedCI}`}
      </button>
      <button class="btn-ghost" style="margin-top:8px;width:100%" onclick={() => showCISheet = false}>
        Cancel
      </button>
    </div>
  </div>
{/if}

<style>
  .jv { display:flex; flex-direction:column; gap:12px; padding-bottom:16px; }

  /* ── Hero ─────────────────────────────────────────────────────────── */
  .jv-hero  { padding:20px 18px 16px; }
  .hero-main { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .hero-left  { display:flex; flex-direction:column; gap:5px; }
  .hero-right { display:flex; flex-direction:column; align-items:center; gap:5px; flex-shrink:0; }

  .hero-sup { font-size:9px; font-weight:700; letter-spacing:0.13em; text-transform:uppercase; color:var(--color-text-3); }
  .hero-ci-row { display:flex; align-items:baseline; gap:10px; }
  .hero-ci-num {
    font-family:var(--font-display); font-size:72px; font-weight:900;
    line-height:0.88; font-variant-numeric:tabular-nums;
  }
  .hero-ci-desc { font-size:13px; color:var(--color-text-2); font-weight:500; max-width:180px; line-height:1.4; }

  .hero-ring-wrap { filter:drop-shadow(0 0 14px oklch(75% 0.19 55 / 0.45)); }
  .hero-ring-sub  { font-size:10px; font-weight:700; color:var(--color-text-3); letter-spacing:0.04em; }

  .hero-goal-row {
    display:flex; align-items:center; gap:10px;
    padding-top:14px; border-top:1px solid var(--color-edge);
  }
  .hero-goal-label { font-size:10px; font-weight:700; color:var(--color-text-3); white-space:nowrap; flex-shrink:0; }
  .hero-goal-track { flex:1; height:4px; background:var(--color-edge); border-radius:var(--radius-pill); overflow:hidden; }
  .hero-goal-fill  {
    height:100%;
    background:linear-gradient(90deg, var(--color-ci-lo), var(--color-ci));
    border-radius:var(--radius-pill);
    transition:width 900ms cubic-bezier(0.34,1.56,0.64,1);
  }
  .hero-goal-pct { font-size:11px; font-weight:700; color:var(--color-ci); font-variant-numeric:tabular-nums; flex-shrink:0; }

  /* ── Projection ───────────────────────────────────────────────────── */
  .proj-card { padding:16px; }
  .proj-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0; }
  .proj-cell {
    display:flex; flex-direction:column; align-items:center; gap:5px;
    padding:12px 8px; text-align:center;
    background:var(--color-surface-2); border:1px solid var(--color-edge);
    border-radius:var(--radius-md);
  }
  .proj-val { font-size:20px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
  .proj-key { font-size:9px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-3); text-align:center; }
  .proj-est-line { font-size:12px; color:var(--color-text-2); text-align:center; margin-top:6px; line-height:1.6; }
  .proj-disclaimer { font-size:9px; color:var(--color-text-4); text-align:center; margin-top:8px; }

  /* ── Journey Map ──────────────────────────────────────────────────── */
  .jmap-card { padding:16px; }
  .jmap { display:flex; flex-direction:column; margin-top:10px; }

  .jmap-row { display:flex; gap:12px; }
  .is-current .jmap-content .jmap-ci-tag { color:var(--color-ci); }
  .is-past    .jmap-content .jmap-ci-tag { color:var(--color-accent); }

  .jmap-spine { display:flex; flex-direction:column; align-items:center; flex-shrink:0; width:40px; }

  .jmap-node {
    width:40px; height:40px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    transition:all 250ms;
  }
  .node-past {
    background:oklch(72% 0.22 292 / 0.12);
    border:2px solid var(--color-accent-ring);
    color:var(--color-accent);
  }
  .node-current {
    background:var(--color-ci-tint);
    border:2px solid var(--color-ci);
    color:var(--color-ci);
    box-shadow:0 0 22px oklch(75% 0.19 55 / 0.55);
    animation:node-pulse 2.4s ease-in-out infinite;
  }
  .node-future {
    background:var(--color-surface-2);
    border:1px solid var(--color-edge);
    color:var(--color-text-4);
  }
  @keyframes node-pulse {
    0%,100% { box-shadow:0 0 14px oklch(75% 0.19 55 / 0.4); }
    50%      { box-shadow:0 0 30px oklch(75% 0.19 55 / 0.75); }
  }
  .node-icon { font-size:12px; font-weight:800; line-height:1; }
  .node-num  { font-size:14px; font-weight:700; color:var(--color-text-4); }

  .jmap-line { flex:1; width:2px; background:var(--color-edge); min-height:14px; transition:background 400ms; }
  .line-done { background:var(--color-accent-ring); }

  .jmap-content {
    flex:1; background:none; border:none; cursor:pointer;
    text-align:left; padding:8px 0 14px; min-width:0;
    display:flex; flex-direction:column; gap:3px;
  }
  .jmap-header-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .jmap-ci-tag     { font-size:13px; font-weight:800; color:var(--color-text-2); font-family:var(--font-display); transition:color 200ms; }
  .jmap-goal-pip   {
    padding:1px 7px; border-radius:var(--radius-pill);
    background:var(--color-ci-tint); border:1px solid var(--color-ci-ring);
    font-size:8px; font-weight:800; color:var(--color-ci); letter-spacing:0.08em;
  }
  .jmap-short  { font-size:11px; color:var(--color-text-3); flex:1; }
  .jmap-chev   { color:var(--color-text-4); flex-shrink:0; transition:transform 220ms var(--ease-out-expo); }
  .jmap-detail { font-size:12px; color:var(--color-text-3); line-height:1.7; margin-top:4px; }

  /* ── CI Update button ────────────────────────────────────────────── */
  .btn-ci-update {
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:15px 20px; width:100%; cursor:pointer;
    background:var(--color-ci-tint); border:1px solid var(--color-ci-ring);
    border-radius:var(--radius-md); color:var(--color-ci);
    font-size:14px; font-weight:700;
    box-shadow:0 0 20px oklch(75% 0.19 55 / 0.12);
    transition:all 200ms;
  }
  .btn-ci-update:hover { background:oklch(75% 0.19 55 / 0.15); box-shadow:0 0 28px oklch(75% 0.19 55 / 0.28); }
  .btn-ci-update:active { transform:scale(0.97); }

  /* ── Sheet internals ─────────────────────────────────────────────── */
  .sheet-backdrop {
    position:fixed; inset:0; background:oklch(0% 0 0 / 0.75);
    backdrop-filter:blur(4px); z-index:50;
    display:flex; align-items:flex-end; justify-content:center;
    max-width:480px; margin:0 auto;
  }
  .backdrop-dismiss {
    position:absolute; inset:0; width:100%; height:100%;
    background:none; border:none; cursor:pointer; z-index:0;
  }
  .sheet { position:relative; z-index:1; }

  .sheet-title-ci {
    font-family:var(--font-display); font-size:18px; font-weight:700;
    color:var(--color-ci); text-align:center; margin-bottom:8px;
  }
  .sheet-hint-ci { font-size:12px; color:var(--color-text-3); text-align:center; margin-bottom:20px; line-height:1.55; }

  .ci-selector { display:flex; flex-direction:column; gap:6px; margin-bottom:20px; }
  .ci-sel-btn {
    display:flex; align-items:center; gap:12px; padding:12px 14px;
    background:var(--color-surface-2); border:1px solid var(--color-edge);
    border-radius:var(--radius-md); cursor:pointer; text-align:left;
    transition:all 150ms; position:relative;
  }
  .ci-sel-btn:hover { border-color:var(--color-ci-ring); }
  .ci-sel-active { background:var(--color-ci-tint); border-color:var(--color-ci-ring); }
  .ci-sel-num  { font-size:13px; font-weight:800; color:var(--color-ci); min-width:36px; flex-shrink:0; font-family:var(--font-display); }
  .ci-sel-desc { font-size:12px; color:var(--color-text-2); flex:1; }
  .ci-sel-check { font-size:14px; color:var(--color-ci); flex-shrink:0; }

  .btn-ci-save {
    display:flex; align-items:center; justify-content:center;
    padding:15px 20px; border:none; border-radius:var(--radius-md); width:100%;
    background:linear-gradient(135deg, var(--color-ci-lo), var(--color-ci));
    color:oklch(98% 0.01 280); font-size:14px; font-weight:700;
    cursor:pointer; box-shadow:0 4px 20px oklch(75% 0.19 55 / 0.3);
    transition:opacity 150ms, transform 120ms;
  }
  .btn-ci-save:disabled { opacity:0.3; cursor:not-allowed; }
  .btn-ci-save:not(:disabled):active { transform:scale(0.97); }

  /* ── CI Aurora Ceremony ──────────────────────────────────────────── */
  .ceremony-overlay {
    position:fixed; inset:0; z-index:65;
    background:oklch(7% 0.04 55 / 0.96);
    backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
    display:flex; align-items:center; justify-content:center;
    padding:32px; cursor:pointer;
  }
  .aur-ring {
    position:absolute; border-radius:50%;
    border:2px solid var(--color-ci);
    width:260px; height:260px;
    animation:aur-expand 3.5s var(--ease-out-expo) infinite;
  }
  .ar1 { animation-delay:0ms; }
  .ar2 { animation-delay:800ms; }
  .ar3 { animation-delay:1600ms; }
  @keyframes aur-expand {
    0%   { transform:scale(0.4); opacity:0.9; }
    100% { transform:scale(4.5); opacity:0; }
  }

  .ceremony-body {
    position:relative; z-index:1;
    display:flex; flex-direction:column; align-items:center;
    gap:18px; text-align:center; max-width:300px;
  }
  .ceremony-badge {
    display:flex; align-items:baseline; gap:8px;
    padding:18px 32px; border-radius:var(--radius-xl);
    background:var(--color-ci-tint); border:2px solid var(--color-ci);
    box-shadow:0 0 70px oklch(75% 0.19 55 / 0.65), inset 0 1px 0 oklch(100% 0 0 / 0.15);
    animation:badge-pop 700ms cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes badge-pop {
    0%   { transform:scale(0) rotate(-10deg); opacity:0; }
    60%  { transform:scale(1.15) rotate(4deg); }
    100% { transform:scale(1) rotate(0); opacity:1; }
  }
  .cbadge-label { font-family:var(--font-display); font-size:26px; font-weight:700; color:var(--color-ci-hi); }
  .cbadge-num   {
    font-family:var(--font-display); font-size:76px; font-weight:900;
    color:var(--color-ci); line-height:0.88;
    text-shadow:0 0 50px oklch(75% 0.19 55 / 0.7);
  }
  .ceremony-title { font-family:var(--font-display); font-size:28px; font-weight:800; color:var(--color-ci-hi); }
  .ceremony-msg   { font-size:15px; line-height:1.8; color:var(--color-text-2); }
  .ceremony-bar-wrap { width:100%; height:3px; background:oklch(100% 0 0 / 0.1); border-radius:var(--radius-pill); overflow:hidden; }
  .ceremony-bar      { height:100%; background:var(--color-ci); border-radius:var(--radius-pill); animation:cbar-drain 5.2s linear forwards; }
  @keyframes cbar-drain { from { width:100%; } to { width:0%; } }
  .ceremony-hint { font-size:10px; color:var(--color-text-4); font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
</style>