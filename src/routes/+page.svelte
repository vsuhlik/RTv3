<script>
  import { currentTab } from '$lib/stores/navigation.js';
  import TodayView from '$lib/views/TodayView.svelte';

  const TAB_STUBS = {
    journey:   { icon: '◑', title: 'Journey' },
    photos:    { icon: '📸', title: 'Photos' },
    reports:   { icon: '📊', title: 'Reports' },
    badges:    { icon: '🏅', title: 'Badges' },
    community: { icon: '👥', title: 'Community' },
  };

  let stub = $derived(TAB_STUBS[$currentTab]);
</script>

{#if $currentTab === 'today'}
  <TodayView />
{:else if stub}
  <div class="stub-view">
    <div class="surface-gold stub-hero animate-slide-up">
      <span style="font-size:42px">{stub.icon}</span>
      <h1 class="stub-title gradient-text-ember">{stub.title}</h1>
      <div class="pill pill-accent" style="margin-top:4px">Coming in Phase 3</div>
    </div>
  </div>
{/if}

<style>
  .stub-view { display: flex; flex-direction: column; gap: 12px; }
  .stub-hero {
    padding: 40px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .stub-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
  }
</style>