<script>
  import '../app.css';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import AppNav from '$lib/components/AppNav.svelte';
  import { currentTab, previousTab, TABS, navigateTo } from '$lib/stores/navigation.js';
  import { fly } from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';

  // SVELTE 5: Destructure children from props
  let { children } = $props();

  // SVELTE 5: Use $derived instead of $: for reactivity
  let tabIndex     = $derived(TABS.findIndex(t => t.id === $currentTab));
  let prevTabIndex = $derived(TABS.findIndex(t => t.id === $previousTab));
  let direction    = $derived(tabIndex >= prevTabIndex ? 1 : -1);

  // Placeholder values for now
  const ciLabel    = 'CI-0';
  const profileName = 'Restorer';
</script>

<div class="app-shell">
  <AppHeader
    {ciLabel}
    {profileName}
    onCIClick={() => navigateTo('journey')}
    onProfileClick={() => console.log('profile')}
  />

  <main class="app-content">
    {#key $currentTab}
      <div
        class="tab-view"
        in:fly={{
          x: 18 * direction,
          duration: 220,
          easing: cubicOut,
          delay: 30
        }}
        out:fly={{
          x: -14 * direction,
          duration: 180,
          easing: cubicIn
        }}
      >
        {@render children()}
      </div>
    {/key}
  </main>

  <AppNav />
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    /* Prevent flash of white during transitions */
    background-color: var(--color-base);
  }

  .app-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    /* Bottom padding accounts for nav height + safe area */
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  .tab-view {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--color-edge) transparent;
  }
</style>