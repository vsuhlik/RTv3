<script>
  import { DotLottieSvelte } from '@lottiefiles/dotlottie-svelte';
  import { browser } from '$app/environment';

  let {
    src,
    width  = 32,
    height = 32,
    loop   = true,
    autoplay = true,
    speed  = 1,
  } = $props();
</script>

{#if browser}
  <span style="display:inline-flex;width:{width}px;height:{height}px;flex-shrink:0;overflow:hidden;">
    <DotLottieSvelte
      {src}
      {loop}
      {autoplay}
      {speed}
      style="width:{width}px;height:{height}px;display:block;"
    />
  </span>
{/if}