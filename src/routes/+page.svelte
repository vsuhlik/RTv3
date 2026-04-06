<script>
  import { currentTab } from '$lib/stores/navigation.js';

  const TAB_STUBS = {
    today:     { icon: '⏱', title: 'Today',     desc: 'Session logging, goal tracking, and daily summary.' },
    journey:   { icon: '◑', title: 'Journey',    desc: 'CI timeline, arc visualisation, and progress history.' },
    photos:    { icon: '📸', title: 'Photos',     desc: 'Progress photo journal with era grouping.' },
    reports:   { icon: '📊', title: 'Reports',    desc: 'Weekly bars, monthly calendar, and method breakdown.' },
    badges:    { icon: '🏅', title: 'Badges',     desc: 'Achievement groups and milestone progress.' },
    community: { icon: '👥', title: 'Community',  desc: 'Live members, posts, and encouragements.' },
  };

  // SVELTE 5: Use $derived
  let stub = $derived(TAB_STUBS[$currentTab]);
</script>

{#if stub}
  <div class="stub-view">

    <!-- Hero card -->
    <div class="surface-gold stub-hero animate-slide-up">
      <span class="stub-icon">{stub.icon}</span>
      <h1 class="stub-title gradient-text-ember">{stub.title}</h1>
      <p class="stub-desc">{stub.desc}</p>
      <div class="stub-badge pill pill-accent">Coming in Phase 2</div>
    </div>

    <!-- Design token showcase -->
    <div class="token-showcase">
      <p class="section-label">Design System Preview</p>

      <!-- Color row -->
      <div class="color-row">
        <div class="swatch" style="background: var(--color-accent)">
          <span>Accent</span>
        </div>
        <div class="swatch" style="background: var(--color-positive)">
          <span>Positive</span>
        </div>
        <div class="swatch" style="background: var(--color-surface-3); border: 1px solid var(--color-edge)">
          <span>Surface 3</span>
        </div>
        <div class="swatch" style="background: var(--color-caution)">
          <span>Caution</span>
        </div>
      </div>

      <!-- Typography preview -->
      <div class="surface-card type-preview">
        <div class="text-display-xl gradient-text-ember">CI-5</div>
        <div class="text-title-md" style="color: var(--color-text-1); margin-top: 4px">Halfway Home</div>
        <div class="text-body-sm" style="color: var(--color-text-2); margin-top: 6px; line-height: 1.7">
          Most restoration benefits are felt at this stage. The glans is beginning to spend meaningful time covered and protected.
        </div>
      </div>

      <!-- Button preview -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px">
        <button class="btn-primary">▶ Start Session</button>
        <div style="display: flex; gap: 8px">
          <button class="btn-ghost" style="flex: 1">Log Past</button>
          <button class="btn-ghost" style="flex: 1">🛌 Rest Day</button>
        </div>
        <button class="btn-positive">🎯 Goal Reached</button>
      </div>

      <!-- Pill examples -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px">
        <span class="pill pill-accent">🔥 42-day streak</span>
        <span class="pill pill-positive">🎯 Goal met</span>
        <span class="pill pill-neutral">CI-5</span>
      </div>
    </div>

  </div>
{/if}

<style>
  .stub-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 8px;
  }

  .stub-hero {
    padding: 28px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .stub-icon   { font-size: 42px; line-height: 1; }
  .stub-title  { font-family: var(--font-display); font-size: 28px; font-weight: 700; }
  .stub-desc   { font-size: 13px; color: var(--color-text-2); line-height: 1.7; max-width: 280px; }
  .stub-badge  { margin-top: 4px; }

  .token-showcase {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .color-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .swatch {
    border-radius: var(--radius-md);
    height: 52px;
    display: flex;
    align-items: flex-end;
    padding: 5px 6px;
  }
  .swatch span {
    font-size: 8px;
    font-weight: 700;
    color: rgba(0,0,0,0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-preview {
    padding: 16px;
  }
</style>