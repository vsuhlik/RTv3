<script>
  import { fade } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';

  let {
    ciLevel = 0,
    isSessionActive = false,
    dailyGoalReached = false,
  } = $props();

  // ── Internal transition state ─────────────────────────────────────────
  let displayLevel   = $state(ciLevel);
  let isTransitioning = $state(false);
  let showBurst      = $state(false);
  let isLongPress    = $state(false);
  let clickBounce    = $state(false);
  let longPressTimer = null;
  let _prevLevel     = $state(ciLevel);
  let _prevGoal      = $state(false);

  // Cinematic level-up: dim → swap → reveal (total ~2.1s)
  $effect(() => {
    const next = ciLevel;
    if (next !== _prevLevel) {
      isTransitioning = true;
      _prevLevel = next;
      setTimeout(() => {
        displayLevel = next;
        setTimeout(() => { isTransitioning = false; }, 1400);
      }, 700);
    }
  });

  // One-shot goal burst
  $effect(() => {
    if (dailyGoalReached && !_prevGoal) {
      _prevGoal = true;
      showBurst = true;
      setTimeout(() => { showBurst = false; }, 3800);
    }
    if (!dailyGoalReached) _prevGoal = false;
  });

  // ── Stage palette ─────────────────────────────────────────────────────
  // Colors progress: cool indigo/slate → cyan → purple/pink → orange → gold
  const STAGES = [
    { name: 'Dormant',   hue: 268, ch: 0.12, l: 38, gl: 45, ar: 60 },
    { name: 'Cracking',  hue: 256, ch: 0.16, l: 42, gl: 50, ar: 64 },
    { name: 'Emerging',  hue: 228, ch: 0.18, l: 50, gl: 58, ar: 68 },
    { name: 'Hatchling', hue: 210, ch: 0.20, l: 58, gl: 65, ar: 72 },
    { name: 'Growing',   hue: 285, ch: 0.25, l: 62, gl: 70, ar: 76 }, // CI-4 plateau
    { name: 'Young',     hue: 318, ch: 0.24, l: 66, gl: 74, ar: 80 },
    { name: 'Winged',    hue: 333, ch: 0.22, l: 71, gl: 78, ar: 84 },
    { name: 'Mature',    hue: 36,  ch: 0.20, l: 73, gl: 80, ar: 88 },
    { name: 'Powerful',  hue: 50,  ch: 0.20, l: 77, gl: 84, ar: 92 },
    { name: 'Legendary', hue: 56,  ch: 0.21, l: 83, gl: 90, ar: 97 },
  ];

  // ── Derived values ────────────────────────────────────────────────────
  let stage   = $derived(STAGES[displayLevel] ?? STAGES[0]);
  let stroke  = $derived(`oklch(${stage.l}% ${stage.ch} ${stage.hue})`);
  let glow    = $derived(`oklch(${stage.gl}% ${stage.ch + 0.02} ${stage.hue})`);
  let glowStd = $derived(isLongPress ? 20 : isSessionActive ? 13 : 7);
  let breathe = $derived(isSessionActive ? '2200ms' : '4200ms');
  let auraMul = $derived(isLongPress ? 1.55 : isSessionActive ? 1.32 : 1.0);
  let isMilestone = $derived(displayLevel === 4);

  // ── Interaction handlers ──────────────────────────────────────────────
  function handleClick() {
    clickBounce = true;
    setTimeout(() => { clickBounce = false; }, 420);
  }
  function handlePointerDown() {
    longPressTimer = setTimeout(() => { isLongPress = true; }, 140);
  }
  function handlePointerUp() {
    clearTimeout(longPressTimer);
    isLongPress = false;
  }
</script>

<!-- ─────────────────────────────────────────────────────────────────── -->
<div
  class="dragon-wrap"
  class:transitioning={isTransitioning}
  class:session-active={isSessionActive}
  class:milestone={isMilestone}
  class:bounce={clickBounce}
  style="
    --stroke: {stroke};
    --glow: {glow};
    --breathe: {breathe};
    --aura-r: {stage.ar}px;
    --aura-mul: {auraMul};
  "
  onclick={handleClick}
  onpointerdown={handlePointerDown}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerUp}
  role="img"
  aria-label="CI-{displayLevel} — {stage.name}"
  tabindex="0"
>

  <!-- Ambient aura layers -->
  <div class="aura aura-far"  aria-hidden="true"></div>
  <div class="aura aura-near" aria-hidden="true"></div>

  <!-- SVG stage -->
  <svg
    width="200" height="240"
    viewBox="0 0 200 240"
    class="dragon-svg"
    overflow="visible"
    aria-hidden="true"
  >
    <defs>
      <!-- Reactive glow filter — stdDeviation updated via Svelte binding -->
      <filter id="de-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation={glowStd} result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <!-- Soft inner fill gradient -->
      <radialGradient id="de-fill" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color={glow}   stop-opacity="0.22"/>
        <stop offset="100%" stop-color={stroke}  stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Crossfade SVG shapes on level change -->
    {#key displayLevel}
      <g
        class="stage-g"
        stroke={stroke}
        fill="none"
        filter="url(#de-glow)"
        transition:fade={{ duration: 900, easing: cubicInOut }}
      >

        <!-- ─── CI-0 · Dormant Egg ─────────────────────────────────── -->
        {#if displayLevel === 0}
          <ellipse cx="100" cy="128" rx="40" ry="52" stroke-width="2.5"/>
          <ellipse cx="100" cy="128" rx="40" ry="52" fill="url(#de-fill)" stroke="none"/>
          <ellipse cx="100" cy="128" rx="22" ry="30" stroke-width="1" stroke-dasharray="4 5" opacity="0.45"/>

        <!-- ─── CI-1 · Cracking Egg ────────────────────────────────── -->
        {:else if displayLevel === 1}
          <ellipse cx="100" cy="128" rx="40" ry="52" stroke-width="2.5"/>
          <ellipse cx="100" cy="128" rx="40" ry="52" fill="url(#de-fill)" stroke="none"/>
          <!-- Crack lines -->
          <path d="M100 78 L91 107" stroke-width="2"   stroke-linecap="round"/>
          <path d="M100 78 L110 104" stroke-width="2"  stroke-linecap="round"/>
          <path d="M88 92  L78 118" stroke-width="1.4" stroke-linecap="round"/>
          <!-- Inner glow leak -->
          <circle cx="100" cy="100" r="8" fill={glow} stroke="none" opacity="0.3"/>

        <!-- ─── CI-2 · Emerging ───────────────────────────────────── -->
        {:else if displayLevel === 2}
          <!-- Broken egg bottom arc -->
          <path d="M60 128 A40 52 0 1 0 140 128" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M60 128 A40 52 0 1 0 140 128" fill="url(#de-fill)" stroke="none"/>
          <!-- Upward emerging sweep -->
          <path d="M100 128 C100 98 118 72 100 48" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M100 128 C100 98  82 72 100 48" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Tip glow -->
          <circle cx="100" cy="48" r="5" fill={glow} stroke="none" opacity="0.6"/>

        <!-- ─── CI-3 · Hatchling ───────────────────────────────────── -->
        {:else if displayLevel === 3}
          <!-- Teardrop body -->
          <path d="M100 172 C72 172 58 148 58 126 C58 94 78 62 100 40 C122 62 142 94 142 126 C142 148 128 172 100 172 Z"
            stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M100 172 C72 172 58 148 58 126 C58 94 78 62 100 40 C122 62 142 94 142 126 C142 148 128 172 100 172 Z"
            fill="url(#de-fill)" stroke="none"/>
          <!-- Head dot + eye -->
          <circle cx="100" cy="62" r="10" stroke-width="2"/>
          <circle cx="100" cy="62" r="3"  fill={glow} stroke="none" opacity="0.8"/>
          <!-- Subtle inner spine -->
          <line x1="100" y1="72" x2="100" y2="158" stroke-width="1" stroke-dasharray="4 6" opacity="0.4"/>

        <!-- ─── CI-4 · Growing · THE PLATEAU (special) ────────────── -->
        {:else if displayLevel === 4}
          <!-- Anchored diamond body — perseverance geometry -->
          <path d="M100 45 L135 122 L100 182 L65 122 Z" stroke-width="2.8" stroke-linejoin="round"/>
          <path d="M100 45 L135 122 L100 182 L65 122 Z" fill="url(#de-fill)" stroke="none"/>
          <!-- Inner diamond -->
          <path d="M100 68 L120 122 L100 162 L80 122 Z" stroke-width="1.4" opacity="0.55"/>
          <!-- Axis lines - strength symbol -->
          <line x1="100" y1="45" x2="100" y2="182" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.35"/>
          <line x1="65"  y1="122" x2="135" y2="122" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.35"/>
          <!-- Milestone crown -->
          <path d="M88 55 L100 42 L112 55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- ─── CI-5 · Young Dragon ────────────────────────────────── -->
        {:else if displayLevel === 5}
          <!-- Body -->
          <path d="M100 45 L128 116 L100 178 L72 116 Z" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M100 45 L128 116 L100 178 L72 116 Z" fill="url(#de-fill)" stroke="none"/>
          <!-- Wing buds -->
          <path d="M72 116 C50 98 40 74 56 58"  stroke-width="2.2" stroke-linecap="round"/>
          <path d="M128 116 C150 98 160 74 144 58" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Head -->
          <circle cx="100" cy="50" r="9" stroke-width="2.2"/>
          <circle cx="100" cy="50" r="3" fill={glow} stroke="none" opacity="0.75"/>
          <!-- Neck -->
          <line x1="100" y1="59" x2="100" y2="45" stroke-width="2" opacity="0"/>

        <!-- ─── CI-6 · Winged Dragon ───────────────────────────────── -->
        {:else if displayLevel === 6}
          <!-- Body -->
          <path d="M100 42 L124 112 L100 174 L76 112 Z" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M100 42 L124 112 L100 174 L76 112 Z" fill="url(#de-fill)" stroke="none"/>
          <!-- Primary wings -->
          <path d="M76 112 C48 90 28 58 46 38"  stroke-width="2.4" stroke-linecap="round"/>
          <path d="M124 112 C152 90 172 58 154 38" stroke-width="2.4" stroke-linecap="round"/>
          <!-- Wing joint detail -->
          <path d="M62 74 C56 62 60 48 68 44" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M138 74 C144 62 140 48 132 44" stroke-width="1.6" stroke-linecap="round"/>
          <!-- Head -->
          <circle cx="100" cy="47" r="9" stroke-width="2.2"/>
          <circle cx="100" cy="47" r="3.5" fill={glow} stroke="none" opacity="0.8"/>
          <!-- Crown nub -->
          <path d="M94 40 L100 33 L106 40" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- ─── CI-7 · Mature Dragon ───────────────────────────────── -->
        {:else if displayLevel === 7}
          <!-- Elongated elegant body -->
          <path d="M100 32 C118 58 122 108 116 155 C112 174 100 190 100 190 C100 190 88 174 84 155 C78 108 82 58 100 32 Z"
            stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M100 32 C118 58 122 108 116 155 C112 174 100 190 100 190 C100 190 88 174 84 155 C78 108 82 58 100 32 Z"
            fill="url(#de-fill)" stroke="none"/>
          <!-- Sweeping primary wings -->
          <path d="M88 112 C58 90 28 68 16 38" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M112 112 C142 90 172 68 184 38" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Wing tips -->
          <path d="M16 38 C20 35 26 34 32 38" stroke-width="2" stroke-linecap="round"/>
          <path d="M184 38 C180 35 174 34 168 38" stroke-width="2" stroke-linecap="round"/>
          <!-- Second wing tier -->
          <path d="M82 132 C55 120 30 108 18 82" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
          <path d="M118 132 C145 120 170 108 182 82" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
          <!-- Crown -->
          <path d="M94 42 L100 28 L106 42" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Spine dashes -->
          <line x1="100" y1="48" x2="100" y2="185" stroke-width="1" stroke-dasharray="5 5" opacity="0.28"/>

        <!-- ─── CI-8 · Powerful Dragon ─────────────────────────────── -->
        {:else if displayLevel === 8}
          <!-- Dense powerful body -->
          <path d="M100 30 C120 54 124 108 118 158 C113 178 100 194 100 194 C100 194 87 178 82 158 C76 108 80 54 100 30 Z"
            stroke-width="2.8"/>
          <path d="M100 30 C120 54 124 108 118 158 C113 178 100 194 100 194 C100 194 87 178 82 158 C76 108 80 54 100 30 Z"
            fill="url(#de-fill)" stroke="none"/>
          <!-- Inner body layer -->
          <path d="M100 52 C110 76 112 118 108 155 C106 168 100 180 100 180 C100 180 94 168 92 155 C88 118 90 76 100 52 Z"
            stroke-width="1.4" opacity="0.55"/>
          <!-- Broad primary wings -->
          <path d="M86 108 C52 84 18 62 6 28"  stroke-width="2.6" stroke-linecap="round"/>
          <path d="M114 108 C148 84 182 62 194 28" stroke-width="2.6" stroke-linecap="round"/>
          <!-- Secondary wings -->
          <path d="M80 132 C46 114 20 98 8 68"  stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
          <path d="M120 132 C154 114 180 98 192 68" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
          <!-- Tertiary sweep -->
          <path d="M76 154 C50 142 30 132 22 112" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          <path d="M124 154 C150 142 170 132 178 112" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          <!-- Double crown -->
          <path d="M91 42 L100 26 L109 42" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M95 36 L100 22 L105 36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>

        <!-- ─── CI-9 · Legendary Dragon ────────────────────────────── -->
        {:else if displayLevel === 9}
          <!-- Perfect symmetrical body diamond -->
          <path d="M100 26 L118 108 L100 204 L82 108 Z" stroke-width="3" stroke-linejoin="round"/>
          <path d="M100 26 L118 108 L100 204 L82 108 Z" fill="url(#de-fill)" stroke="none"/>
          <!-- Inner body -->
          <path d="M100 52 C111 80 112 120 107 158 C105 172 100 185 100 185 C100 185 95 172 93 158 C88 120 89 80 100 52 Z"
            stroke-width="1.6" opacity="0.6"/>
          <!-- Primary wings — top tier -->
          <path d="M82 80 C52 62 20 52 6 22"  stroke-width="2.6" stroke-linecap="round"/>
          <path d="M118 80 C148 62 180 52 194 22" stroke-width="2.6" stroke-linecap="round"/>
          <!-- Primary wings — mid tier -->
          <path d="M80 114 C46 96 14 86 2 58"  stroke-width="2.2" stroke-linecap="round"/>
          <path d="M120 114 C154 96 186 86 198 58" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Secondary sweep -->
          <path d="M78 136 C50 126 26 118 14 96"  stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
          <path d="M122 136 C150 126 174 118 186 96" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
          <!-- Fine detail tertiary -->
          <path d="M76 158 C54 150 36 144 26 128" stroke-width="1.1" stroke-linecap="round" opacity="0.45"/>
          <path d="M124 158 C146 150 164 144 174 128" stroke-width="1.1" stroke-linecap="round" opacity="0.45"/>
          <!-- Legendary double crown -->
          <path d="M90 38 L100 22 L110 38" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M94 30 L100 16 L106 30" stroke-width="2"   stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
          <!-- Balance halos -->
          <circle cx="100" cy="108" r="14" stroke-width="1"  stroke-dasharray="3 5" opacity="0.5"/>
          <circle cx="100" cy="108" r="26" stroke-width="0.8" stroke-dasharray="3 7" opacity="0.3"/>
          <!-- Horizontal balance lines -->
          <path d="M82 108 L68 108 M118 108 L132 108" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
          <!-- Central axis -->
          <line x1="100" y1="26" x2="100" y2="204" stroke-width="0.9" stroke-dasharray="5 5" opacity="0.25"/>
        {/if}

      </g>
    {/key}
  </svg>

  <!-- Stage label -->
  <div class="stage-label">
    <span class="ci-tag">CI-{displayLevel}</span>
    <span class="stage-name">{stage.name}</span>
  </div>

  <!-- Goal burst particles -->
  {#if showBurst}
    <div class="burst-wrap" transition:fade={{ duration: 500 }} aria-hidden="true">
      {#each Array.from({ length: 14 }) as _, i}
        <div class="burst-p" style="--i:{i}; --rot:{i * (360 / 14)}deg; --d:{60 + (i % 3) * 22}px"></div>
      {/each}
      <div class="burst-flash"></div>
    </div>
  {/if}

</div>


<style>
  /* ── Wrapper ────────────────────────────────────────────────────────── */
  .dragon-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px 16px 16px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }

  /* ── Aura layers ────────────────────────────────────────────────────── */
  .aura {
    position: absolute;
    top: 52%;
    left: 50%;
    border-radius: 50%;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(var(--aura-mul, 1));
    transition: transform 600ms ease, opacity 600ms ease;
  }

  .aura-far {
    width: calc(var(--aura-r) * 2.6);
    height: calc(var(--aura-r) * 2.6);
    background: radial-gradient(circle, var(--glow) 0%, transparent 68%);
    opacity: 0.16;
    animation: aura-breathe var(--breathe) ease-in-out infinite;
  }

  .aura-near {
    width: calc(var(--aura-r) * 1.7);
    height: calc(var(--aura-r) * 1.7);
    background: radial-gradient(circle, var(--glow) 0%, transparent 58%);
    opacity: 0.24;
    animation: aura-breathe var(--breathe) ease-in-out infinite;
    animation-delay: calc(var(--breathe) * -0.5);
  }

  @keyframes aura-breathe {
    0%, 100% { transform: translate(-50%, -50%) scale(1) scale(var(--aura-mul, 1)); }
    50%       { transform: translate(-50%, -50%) scale(1.1) scale(var(--aura-mul, 1)); }
  }

  /* Milestone (CI-4): intensified pulse to signal perseverance */
  .milestone .aura-far,
  .milestone .aura-near {
    animation-name: milestone-aura;
    animation-duration: 2.6s;
  }
  @keyframes milestone-aura {
    0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: inherit; }
    50%       { transform: translate(-50%, -50%) scale(1.22); opacity: 0.4;    }
  }

  /* Active session: push intensity */
  .session-active .aura-far  { opacity: 0.26; }
  .session-active .aura-near { opacity: 0.36; }

  /* ── SVG ────────────────────────────────────────────────────────────── */
  .dragon-svg {
    display: block;
    animation: svg-breathe var(--breathe) ease-in-out infinite;
    transition: filter 600ms ease, opacity 600ms ease;
    transform-origin: center;
  }

  @keyframes svg-breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.028); }
  }

  /* Cinematic dim during transition */
  .transitioning .dragon-svg {
    opacity: 0.25;
    filter: brightness(0.35);
  }

  /* Click bounce */
  .bounce .dragon-svg {
    animation: bounce-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes bounce-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(0.93); }
    72%  { transform: scale(1.07); }
    100% { transform: scale(1); }
  }

  /* ── Stage label ────────────────────────────────────────────────────── */
  .stage-label {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 2;
  }

  .ci-tag {
    font-family: var(--font-display, 'Syne Variable', monospace);
    font-size: 10px;
    font-weight: 800;
    color: var(--stroke);
    padding: 2px 10px;
    border: 1px solid var(--stroke);
    border-radius: 999px;
    opacity: 0.9;
    letter-spacing: 0.12em;
    transition: color 800ms ease, border-color 800ms ease;
  }

  .stage-name {
    font-size: 9px;
    font-weight: 700;
    color: var(--glow);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    opacity: 0.65;
    transition: color 800ms ease;
  }

  /* ── Goal burst ─────────────────────────────────────────────────────── */
  .burst-wrap {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }

  .burst-p {
    position: absolute;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--glow);
    animation: burst-fly 2.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 40ms);
  }
  @keyframes burst-fly {
    0%   { transform: rotate(var(--rot)) translateX(0)        scale(1.2); opacity: 1; }
    60%  { opacity: 0.85; }
    100% { transform: rotate(var(--rot)) translateX(var(--d)) scale(0);   opacity: 0; }
  }

  .burst-flash {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, var(--glow) 0%, transparent 60%);
    opacity: 0;
    animation: flash-out 1s ease-out both;
  }
  @keyframes flash-out {
    0%   { opacity: 0.5; transform: scale(0.6); }
    100% { opacity: 0;   transform: scale(2.2); }
  }
</style>