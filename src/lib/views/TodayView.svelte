<script module>
  // Lives outside the component lifecycle — survives tab switches
  let _celebShownDate = '';
</script>

<script>
  import { char }        from '$lib/stores/profile.js';
  import { logs }        from '$lib/stores/logs.js';
  import { activeSession, timerSecs, startTimer, stopTimer, updateSessionStart } from '$lib/stores/timer.js';
import { todayLogs, todayMin, goalPct, isRestDay, todayStr } from '$lib/stores/derived.js';
import LottieIcon from '$lib/components/LottieIcon.svelte';
import autoAnimate from '@formkit/auto-animate';
import { gsap } from 'gsap';
import { fade } from 'svelte/transition';
import { browser } from '$app/environment';

  // ── Ring geometry ─────────────────────────────────────────────────────
  const R = 108, CX = 140, CY = 140;
  const CIRC = +(2 * Math.PI * R).toFixed(4);
  let dashOffset = $derived(+(CIRC * (1 - Math.min($goalPct / 100, 1))).toFixed(4));
  let isGoalMet  = $derived($goalPct >= 100);

  // ── Celebration (fires once per calendar day) ─────────────────────────
  let showCelebration = $state(false);
  $effect(() => {
    if ($goalPct >= 100 && _celebShownDate !== todayStr()) {
      _celebShownDate = todayStr();
      showCelebration = true;
      setTimeout(() => { showCelebration = false; }, 3000);
    }
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
    { id: 'retaining', label: 'Retaining', icon: '○',
      methods: [
        { id: 'ret_manual',  label: 'Manual Retain'     },
        { id: 'ret_device',  label: 'Retaining Device'  },
        { id: 'ret_tape',    label: 'T-Tape'            },
        { id: 'ret_skin',    label: 'Skin Retaining'    },
      ]
    },
    { id: 'other', label: 'Other / Custom', icon: '✴', methods: [] },
  ];

// ── Milestones ────────────────────────────────────────────────────────
  const MILESTONES = [
    { key: 'm_1hr',       check: c => (c.totalMinutes??0) >= 60,    emoji: '⏱', title: 'First Hour',      msg: 'Your first hour of TUT is in the books. The journey has officially started.' },
    { key: 'm_10hr',      check: c => (c.totalMinutes??0) >= 600,   emoji: '🔥', title: '10 Hours TUT',    msg: '10 hours of consistent tension. Your skin is responding. Keep the momentum.' },
    { key: 'm_50hr',      check: c => (c.totalMinutes??0) >= 3000,  emoji: '💪', title: '50 Hours TUT',    msg: "50 hours. You're past the point where most people quit. Real progress takes real time — and you're putting it in." },
    { key: 'm_100hr',     check: c => (c.totalMinutes??0) >= 6000,  emoji: '🏆', title: '100 Hours TUT',   msg: "100 hours. That's 100 hours of choosing yourself. Of building something most people don't even know is possible. Keep going." },
    { key: 'm_250hr',     check: c => (c.totalMinutes??0) >= 15000, emoji: '⚡', title: '250 Hours TUT',   msg: "250 hours in. You're not just restoring — you're one of the most committed restorers out there. This is rare dedication." },
    { key: 'm_streak7',   check: c => (c.streak??0) >= 7,           emoji: '🗓', title: '7-Day Streak',    msg: "A full week without missing a day. That's not luck — that's discipline forming into habit." },
    { key: 'm_streak30',  check: c => (c.streak??0) >= 30,          emoji: '🌙', title: '30-Day Streak',   msg: "30 days straight. A full month of showing up every single day. You're not just restoring — you're living it." },
    { key: 'm_streak100', check: c => (c.streak??0) >= 100,         emoji: '👑', title: '100-Day Streak',  msg: "100 consecutive days. Less than 1% of restorers ever reach this. You're in rare company." },
    { key: 'm_10sess',    check: c => (c.totalSessions??0) >= 10,   emoji: '✅', title: '10 Sessions',     msg: "Double digits. You've logged 10 sessions — the habit is starting to take root." },
    { key: 'm_50sess',    check: c => (c.totalSessions??0) >= 50,   emoji: '🎯', title: '50 Sessions',     msg: "50 sessions logged. Consistency like this is what separates results from wishes." },
    { key: 'm_100sess',   check: c => (c.totalSessions??0) >= 100,  emoji: '💯', title: '100 Sessions',    msg: "100 sessions. That number represents real, relentless effort. You've earned this moment." },
  ];

  let groups = $derived(BASE_GROUPS.map(g => ({
    ...g,
    methods: [...g.methods, ...($char.customMethods ?? []).filter(m => m.groupId === g.id)],
  })));

  // ── UI state ──────────────────────────────────────────────────────────
  let showMethodSheet  = $state(false);
  let showSessionSheet = $state(false);
  let sessionSaved     = $state(false);
  let showSavedToast   = $state(false);
  let showGoalEditor   = $state(false);
  let showEditTime     = $state(false);
  let selectedMethod   = $state(null);
  let expandedGroup    = $state('devices');
  let addingToGroup    = $state(null);
  let newMethodName    = $state('');
  let editTimeValue    = $state('');
  let editDateValue    = $state('');
  let editGoalValue    = $state('');
  let editTimeError    = $state('');
  let editTimeSuccess  = $state(false);

// ── Milestone state ───────────────────────────────────────────────────
  let showMilestone    = $state(false);
  let currentMilestone = $state(null);
  let _milestoneInit   = false;

  // ── Log Past Session ──────────────────────────────────────────────────
  let showLogPast      = $state(false);
  let pastStart        = $state('');
  let pastEnd          = $state('');

  // ── Goal contribution toggle ─────────────────────────────────────────
  let countTowardGoal  = $state(true);
  let isRetaining      = $derived(
    selectedMethod
      ? (groups.find(g => g.id === 'retaining')?.methods.some(m => m.id === selectedMethod.id) ?? false)
      : false
  );
  $effect(() => {
    if (selectedMethod) countTowardGoal = !isRetaining;
  });

// ── Rest day body class ───────────────────────────────────────────────
  $effect(() => {
    if (!browser) return;
    if ($isRestDay) {
      document.body.classList.add('rest-day-mode');
    } else {
      document.body.classList.remove('rest-day-mode');
    }
    return () => { if (browser) document.body.classList.remove('rest-day-mode'); };
  });

  // ── Milestone detection ───────────────────────────────────────────────
  $effect(() => {
    const c = $char;
    if (!_milestoneInit) { _milestoneInit = true; return; }
    if (!(c.totalSessions ?? 0)) return;
    const seen = c.milestonesSeen ?? [];
    const hit  = MILESTONES.find(m => !seen.includes(m.key) && m.check(c));
    if (!hit) return;
    char.update(cc => ({ ...cc, milestonesSeen: [...(cc.milestonesSeen ?? []), hit.key] }));
    setTimeout(() => {
      currentMilestone = hit;
      showMilestone    = true;
      setTimeout(() => { showMilestone = false; currentMilestone = null; }, 5200);
    }, 1600);
  });

  // ── Ring tap ──────────────────────────────────────────────────────────
  function onRingTap() {
    if ($activeSession) {
      const d = new Date($activeSession.startTs);
      editTimeValue = `${p(d.getHours())}:${p(d.getMinutes())}`;
      editDateValue = d.toISOString().slice(0, 10);
      showSessionSheet = true;
    } else if (!$isRestDay) {
      showMethodSheet = true;
    }
  }

  // ── Session lifecycle ─────────────────────────────────────────────────
  function handleStart() {
    if (!selectedMethod) return;
    startTimer({ method: selectedMethod.id, methodLabel: selectedMethod.label, category: 'active', countTowardGoal });
    showMethodSheet = false;
    selectedMethod = null;
  }

function handleStop() {
    showSessionSheet = false;
    const session = stopTimer();
    if (!session) return;
    const rawMs = Date.now() - (session.startTs ?? Date.now());
    const dur   = isFinite(rawMs) && rawMs > 0
      ? Math.max(1, Math.round(rawMs / 60000))
      : 1;
    console.log('[handleStop] dur (mins):', dur, '| startTs:', session.startTs);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      date: todayStr(),
      startTs: session.startTs,
      endTs: Date.now(),
      dur,
      method: session.method || 'unknown',
      methodLabel: session.methodLabel ?? session.method ?? 'Unknown',
      category: 'active',
      tension: 'med',
      notes: '',
      isRest: false,
      countTowardGoal: session.countTowardGoal !== false,
    };
    console.log('[handleStop] adding entry:', entry);
    logs.add(entry);
    console.log('[handleStop] logs after add:', logs.get());
    bumpStreak(dur);
    showSessionSheet = false;
    showSavedToast = true;
    setTimeout(() => { showSavedToast = false; }, 2800);
  }

function applyEditTime() {
    editTimeError = '';
    if (!editTimeValue || !$activeSession) {
      editTimeError = 'Please enter a valid time.';
      return;
    }
    const [hh, mm] = editTimeValue.split(':').map(Number);
    const dateStr  = editDateValue || new Date().toISOString().slice(0, 10);
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const newTs = new Date(yr, mo - 1, dy, hh, mm, 0).getTime();
    if (isNaN(newTs)) {
      editTimeError = 'Invalid time — check the values.';
      return;
    }
    if (newTs > Date.now()) {
      editTimeError = 'Start time can\'t be in the future.';
      return;
    }

    updateSessionStart(newTs);
    editTimeSuccess = true;
    setTimeout(() => {
      editTimeSuccess = false;
      showEditTime = false;
    }, 1200);
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

  // ── Rest day ─────────────────────────────────────────────────────────
  let showRestToast = $state(false);
  let restToastMsg  = $state('');

  function safeId() {
    try { return crypto.randomUUID(); } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
  }

  function markRestDay() {
    if ($isRestDay) {
      logs.setAll(logs.get().filter(l => !(l.date === todayStr() && l.isRest)));
      restToastMsg = '✗ Rest day removed';
    } else {
      const today = todayStr();
      logs.add({ id: safeId(), date: today, isRest: true, dur: 0 });
      char.update(c => c.lastSessionDate === today ? c : { ...c, lastSessionDate: today });
      restToastMsg = '🛌 Rest day on — streak protected';
    }
    showRestToast = true;
    setTimeout(() => { showRestToast = false; }, 2500);
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

// ── Log Past Session ──────────────────────────────────────────────────
  function logPastSession() {
    if (!selectedMethod || !pastStart || !pastEnd) return;
    const startTs = new Date(pastStart).getTime();
    const endTs   = new Date(pastEnd).getTime();
    if (isNaN(startTs) || isNaN(endTs) || endTs <= startTs) return;
    const dur  = Math.max(1, Math.round((endTs - startTs) / 60000));
    const date = pastStart.slice(0, 10);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      date,
      startTs,
      endTs,
      dur,
      method:       selectedMethod.id,
      methodLabel:  selectedMethod.label,
      category:     'active',
      tension:      'med',
      notes:        '',
      isRest:       false,
      countTowardGoal,
    };
    logs.add(entry);
    char.update(c => ({
      ...c,
      totalMinutes:  (c.totalMinutes  || 0) + dur,
      totalSessions: (c.totalSessions || 0) + 1,
    }));
    showLogPast     = false;
    showMethodSheet = false;
    selectedMethod  = null;
    pastStart       = '';
    pastEnd         = '';
    showSavedToast  = true;
    setTimeout(() => { showSavedToast = false; }, 2800);
  }
  let expandedSessionId    = $state(/** @type {string|null} */(null));
  let showEditSessionSheet = $state(false);
  let editingSession       = $state(/** @type {any} */(null));
  let editSessionDur       = $state('');
  let editSessionMethod    = $state(/** @type {any} */(null));
  let allMethods           = $derived(groups.flatMap(g => g.methods));

  // Auto-expand first session when list changes
  $effect(() => {
    if ($todayLogs.length > 0 && !$todayLogs.find(l => l.id === expandedSessionId)) {
      expandedSessionId = $todayLogs[0].id;
    }
    if ($todayLogs.length === 0) expandedSessionId = null;
  });

  function deleteSession(id) {
    const entry = $todayLogs.find(l => l.id === id);
    if (!entry) return;
    logs.remove(id);
    char.update(c => ({
      ...c,
      totalMinutes: Math.max(0, (c.totalMinutes || 0) - (entry.dur || 0)),
      totalSessions: Math.max(0, (c.totalSessions || 0) - 1),
    }));
  }

  function openEditSession(entry) {
    editingSession    = entry;
    editSessionDur    = String(entry.dur || 1);
    editSessionMethod = { id: entry.method, label: entry.methodLabel ?? entry.method };
    showEditSessionSheet = true;
  }

  function saveEditSession() {
    if (!editingSession) return;
    const dur  = Math.max(1, parseInt(editSessionDur) || 1);
    const diff = dur - (editingSession.dur || 0);
    logs.setAll($logs.map(l =>
      l.id === editingSession.id
        ? { ...l, dur, method: editSessionMethod?.id ?? l.method, methodLabel: editSessionMethod?.label ?? l.methodLabel }
        : l
    ));
    char.update(c => ({ ...c, totalMinutes: (c.totalMinutes || 0) + diff }));
    showEditSessionSheet = false;
    editingSession = null;
  }

// ── GSAP animated display values ─────────────────────────────────────
  let displayStreak   = $state($char.streak ?? 0);
  let displayTodayMin = $state($todayMin);
  let displayGoalPct  = $state($goalPct);

  let _streakTween   = null;
  let _totalMinTween = null;
  let _goalPctTween  = null;

  // Streak counter — fires whenever streak changes
  $effect(() => {
    const target = $char.streak ?? 0;
    if (_streakTween) _streakTween.kill();
    const obj = { val: displayStreak };
    _streakTween = gsap.to(obj, {
      val: target,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => { displayStreak = Math.round(obj.val); }
    });
  });

  // Today total + goal % — only animate when no live session running
  $effect(() => {
    if ($activeSession) return;
    const target = $todayMin;
    if (_totalMinTween) _totalMinTween.kill();
    const obj = { val: displayTodayMin };
    _totalMinTween = gsap.to(obj, {
      val: target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => { displayTodayMin = Math.round(obj.val); }
    });
  });

  $effect(() => {
    if ($activeSession) return;
    const target = $goalPct;
    if (_goalPctTween) _goalPctTween.kill();
    const obj = { val: displayGoalPct };
    _goalPctTween = gsap.to(obj, {
      val: target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => { displayGoalPct = Math.round(obj.val); }
    });
  });

  // ── Ring center display ───────────────────────────────────────────────
  let ringMainText = $derived(
    $activeSession    ? fmtLive($timerSecs)      :
    displayTodayMin > 0 ? fmtMin(displayTodayMin) : ''
  );
  let ringSubText = $derived(
    $activeSession      ? ($activeSession.methodLabel ?? $activeSession.method) :
    isGoalMet           ? '🎯 Goal Reached'                                     :
    displayTodayMin > 0 ? `${displayGoalPct}% of goal`                         : ''
  );
  let showCTA = $derived(!$activeSession && $todayMin === 0);
  // ── Comet head position ───────────────────────────────────────────────
let cometAngle = $derived(((-90 + ($goalPct / 100) * 360) * Math.PI) / 180);
let cometX = $derived(+(CX + R * Math.cos(cometAngle)).toFixed(2));
let cometY = $derived(+(CY + R * Math.sin(cometAngle)).toFixed(2));
let showComet = $derived($goalPct > 1 && $goalPct < 100);
</script>

<!-- ── Milestone overlay ─────────────────────────────────────────────── -->
{#if showMilestone && currentMilestone}
  <div
    class="milestone-overlay"
    transition:fade={{ duration: 500 }}
    onclick={() => { showMilestone = false; currentMilestone = null; }}
    onkeydown={(e) => e.key === 'Enter' && (showMilestone = false)}
    role="dialog"
    aria-modal="true"
    aria-label="Milestone reached"
    tabindex="0"
  >
    <div class="milestone-content animate-scale-in">
      <div class="milestone-emoji">{currentMilestone.emoji}</div>
      <h2 class="milestone-title">{currentMilestone.title}</h2>
      <p class="milestone-msg">{currentMilestone.msg}</p>
      <div class="milestone-prog-wrap">
        <div class="milestone-prog-bar"></div>
      </div>
      <p class="milestone-hint">Tap to dismiss</p>
    </div>
  </div>
{/if}

<!-- ── Celebration burst ─────────────────────────────────────────────── -->
{#if showCelebration}
  <div class="celebration" aria-hidden="true">
    <div class="cel-ring r1"></div>
    <div class="cel-ring r2"></div>
    <div class="cel-ring r3"></div>
    <span class="cel-emoji">🎯</span>
  </div>
{/if}

{#if showSavedToast}
  <div class="saved-toast animate-slide-up" aria-live="polite">
    <span class="saved-toast-check">✓</span>
    Session saved!
  </div>
{/if}

{#if showRestToast}
  <div class="saved-toast rest-toast animate-slide-up" aria-live="polite">
    {restToastMsg}
  </div>
{/if}

<!-- ── Top row: greeting + streak ────────────────────────────────────── -->
<div class="top-row">
  <div class="greeting">
    {greeting()}, <strong>{$char.name ?? 'Restorer'}</strong>
  </div>
<div class="streak-chip" class:lit={($char.streak ?? 0) > 0} class:card-live-border={($char.streak ?? 0) > 0}>
  {#if ($char.streak ?? 0) > 0}
    <LottieIcon
      src="/animations/flame.lottie"
      width={18}
      height={18}
      speed={1.2}
    />
  {:else}
    <span style="opacity:0.4;font-size:16px">🔥</span>
  {/if}
  <span class="streak-num">{displayStreak}</span>
</div>
</div>

<!-- ── Hero Ring ─────────────────────────────────────────────────────── -->
<div class="ring-stage" class:ring-rest={$isRestDay}>
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
<filter id="comet-glow" x="-80%" y="-80%" width="260%" height="260%">
  <feGaussianBlur stdDeviation="6" result="blur1"/>
  <feGaussianBlur stdDeviation="3" result="blur2" in="SourceGraphic"/>
  <feMerge>
    <feMergeNode in="blur1"/>
    <feMergeNode in="blur2"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
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

<!-- Comet head at arc leading edge -->
      {#if showComet}
        <circle
          cx={cometX} cy={cometY} r="12"
          fill={isGoalMet ? 'var(--color-ci)' : 'var(--color-accent)'}
          opacity="0.18"
          filter="url(#comet-glow)"
        />
        <circle
          cx={cometX} cy={cometY} r="6"
          fill={isGoalMet ? 'var(--color-ci-hi)' : 'var(--color-accent-hi)'}
          opacity="0.7"
          filter="url(#comet-glow)"
        />
        <circle
          cx={cometX} cy={cometY} r="3"
          fill="oklch(97% 0.01 280)"
          opacity="0.95"
        />
      {/if}
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
  class:shimmer-active={!!$activeSession && !isGoalMet}
></div>
  </div>
  <div class="goal-bottom-row">
    <span class="goal-done-text">{fmtMin(displayTodayMin)} logged</span>
    <span class="goal-left-text">
      {isGoalMet ? 'Complete ✓' : `${fmtMin(Math.max(0, ($char.dailyGoalMin ?? 480) - displayTodayMin))} remaining`}
    </span>
  </div>
</div>

<!-- ── Rest day toggle ─────────────────────────────────────────────────── -->
{#if !$activeSession}
  <div class="lower-actions">
    <button
      class="btn-rest-day"
      class:rest-day-active={$isRestDay}
      onclick={markRestDay}
    >
      {$isRestDay ? '🛌 Rest Day On — Streak Protected' : '🛌 Log Rest Day'}
    </button>
  </div>
{/if}

<!-- ── Today's sessions ───────────────────────────────────────────────── -->
{#if $todayLogs.length > 0}
  <div class="today-log">
    <p class="section-label">Today's Sessions ({$todayLogs.length})</p>
    <div use:autoAnimate>
    {#each $todayLogs as entry (entry.id)}
      <div class="log-item animate-slide-up">
        <button
          class="log-row"
          onclick={() => expandedSessionId = expandedSessionId === entry.id ? null : entry.id}
        >
          <div class="log-left">
            <span class="log-dot"></span>
            <span class="log-method">{entry.methodLabel ?? entry.method}</span>
          </div>
          <div class="log-right">
            <span class="log-dur">{fmtMin(entry.dur)}</span>
            <svg
              class="log-chevron"
              style="transform:rotate({expandedSessionId === entry.id ? 180 : 0}deg);transition:transform 220ms"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"
            ><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </button>
        {#if expandedSessionId === entry.id}
          <div class="log-detail animate-fade-in">
            {#if entry.startTs}
              <span class="log-time">
                {new Date(entry.startTs).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                {#if entry.endTs} → {new Date(entry.endTs).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}{/if}
              </span>
            {:else}
              <span class="log-time">Manual entry</span>
            {/if}
            <div class="log-actions">
              <button class="log-action-btn log-edit" onclick={() => openEditSession(entry)}>✏ Edit</button>
              <button class="log-action-btn log-delete" onclick={() => deleteSession(entry.id)}>🗑 Delete</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
    </div>
  </div>
{/if}


<!-- ════════════════════════════════════════════════════════════════════ -->
<!-- SHEET — Method Picker ─────────────────────────────────────────────── -->
{#if showMethodSheet}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Method picker">
    <button class="backdrop-dismiss" onclick={() => showMethodSheet = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up" style="padding-bottom: 120px;">
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

      <!-- ── Goal contribution toggle ──────────────────────────── -->
      {#if selectedMethod}
        <div class="goal-toggle-row">
          <div class="goal-toggle-info">
            <span class="goal-toggle-label">Count toward daily goal</span>
            {#if isRetaining}
              <span class="goal-toggle-hint">Retaining is off by default</span>
            {/if}
          </div>
          <button
            class="toggle-btn"
            class:toggle-on={countTowardGoal}
            onclick={() => countTowardGoal = !countTowardGoal}
            aria-label="Toggle goal contribution"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>
      {/if}

      <button class="btn-primary" style="margin-top:16px"
        disabled={!selectedMethod} onclick={handleStart}
      >
        ▶ Start — {selectedMethod?.label ?? 'select a method above'}
      </button>
      <button class="btn-ghost" style="margin-top:8px;width:100%"
        disabled={!selectedMethod} onclick={() => showLogPast = true}
      >
        📋 Log Past Session
      </button>
      <button class="btn-ghost" style="margin-top:6px" onclick={() => { showMethodSheet = false; selectedMethod = null; }}>
        Cancel
      </button>
    </div>
  </div>
{/if}


<!-- ════════════════════════════════════════════════════════════════════ -->
<!-- SHEET — Log Past Session ────────────────────────────────────────── -->
{#if showLogPast && selectedMethod}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Log past session">
    <button class="backdrop-dismiss" onclick={() => showLogPast = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Log Past Session</h2>
      <p class="sheet-hint">
        Method: <strong style="color:var(--color-accent)">{selectedMethod.label}</strong>
      </p>

      <p class="section-label" style="margin-bottom:6px">Session Start</p>
      <input
        type="datetime-local"
        class="input-field"
        style="margin-bottom:14px;color-scheme:dark"
        bind:value={pastStart}
        max={pastEnd || new Date().toISOString().slice(0,16)}
      />

      <p class="section-label" style="margin-bottom:6px">Session End</p>
      <input
        type="datetime-local"
        class="input-field"
        style="margin-bottom:10px;color-scheme:dark"
        bind:value={pastEnd}
        min={pastStart}
        max={new Date().toISOString().slice(0,16)}
      />

      {#if pastStart && pastEnd && new Date(pastEnd) > new Date(pastStart)}
        <div class="past-dur-preview">
          ⏱ {fmtMin(Math.round((new Date(pastEnd).getTime() - new Date(pastStart).getTime()) / 60000))}
        </div>
      {:else if pastStart && pastEnd}
        <p class="past-err">End time must be after start time.</p>
      {/if}

      <div class="goal-toggle-row" style="margin-top:14px">
        <div class="goal-toggle-info">
          <span class="goal-toggle-label">Count toward daily goal</span>
          {#if isRetaining}
            <span class="goal-toggle-hint">Retaining is off by default</span>
          {/if}
        </div>
        <button
          class="toggle-btn"
          class:toggle-on={countTowardGoal}
          onclick={() => countTowardGoal = !countTowardGoal}
          aria-label="Toggle goal contribution"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>

      <button class="btn-primary" style="margin-top:20px"
        disabled={!pastStart || !pastEnd || new Date(pastEnd) <= new Date(pastStart)}
        onclick={logPastSession}
      >
        💾 Save Past Session
      </button>
      <button class="btn-ghost" style="margin-top:8px" onclick={() => showLogPast = false}>
        ← Back
      </button>
    </div>
  </div>
{/if}
{#if showSessionSheet}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Active session">
    <button class="backdrop-dismiss" onclick={() => showSessionSheet = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up" style="padding-bottom: 100px;">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Live Session</h2>

      <div class="session-card surface-violet card-session-live">
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
        <p class="time-edit-hint">Forgot to start on time?</p>
        {#if showEditTime}
          {#if editTimeSuccess}
            <div class="time-success-banner">✓ Start time updated</div>
          {:else}
            <div class="time-edit-col">
              <div class="time-edit-row">
                <input type="date" class="input-field time-date-input"
                  bind:value={editDateValue}
                  max={new Date().toISOString().slice(0,10)}
                />
              </div>
              <div class="time-edit-row">
                <input type="time" class="input-field" bind:value={editTimeValue} />
                <button class="btn-apply" onclick={applyEditTime}>Apply</button>
                <button class="btn-x" onclick={() => { showEditTime = false; editTimeError = ''; }}>✕</button>
              </div>
            </div>
            {#if editTimeError}
              <p class="time-error-msg">{editTimeError}</p>
            {/if}
          {/if}
        {:else}
          <button class="btn-ghost w-full" onclick={() => { showEditTime = true; editTimeError = ''; editTimeSuccess = false; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Adjust Start Time
          </button>
        {/if}
      </div>

      <button class="btn-primary btn-stop" onclick={handleStop}>⏹ Stop Session</button>
      <button class="btn-ghost" style="margin-top:8px" onclick={() => showSessionSheet = false}>
        Back
      </button>
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


<!-- ════════════════════════════════════════════════════════════════════ -->
<!-- SHEET — Edit Session ─────────────────────────────────────────────── -->
{#if showEditSessionSheet && editingSession}
  <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Edit session">
    <button class="backdrop-dismiss" onclick={() => showEditSessionSheet = false} aria-label="Close"></button>
    <div class="sheet animate-slide-up">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Edit Session</h2>

      <p class="section-label" style="margin-bottom:6px">Duration (minutes)</p>
      <div class="goal-input-wrap" style="margin-bottom:20px">
        <input type="number" class="input-field goal-num-input"
          bind:value={editSessionDur} min="1" placeholder="1"
        />
        <span class="goal-unit">min</span>
      </div>

      <p class="section-label" style="margin-bottom:8px">Method</p>
      <div class="mpills" style="margin-bottom:20px">
        {#each allMethods as m}
          <button class="mpill" class:mpill-selected={editSessionMethod?.id === m.id}
            onclick={() => editSessionMethod = m}
          >{m.label}</button>
        {/each}
      </div>

      <button class="btn-primary" onclick={saveEditSession}>Save Changes</button>
      <button class="btn-ghost" style="margin-top:8px" onclick={() => showEditSessionSheet = false}>Cancel</button>
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
  position: relative;
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
  transition: opacity 1.2s ease, filter 1.2s ease;
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
:global(.rc-timer)    { font: 700 28px 'Geist Mono', monospace; fill: var(--color-accent); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
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
.shimmer-active {
  position: relative;
  overflow: hidden;
}
.shimmer-active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    oklch(100% 0 0 / 0.45) 50%,
    transparent 100%
  );
  animation: bar-shimmer 2.2s ease-in-out infinite;
}
@keyframes bar-shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(300%); }
}
.goal-bottom-row { display: flex; justify-content: space-between; }
.goal-done-text, .goal-left-text { font-size: 11px; color: var(--color-text-3); font-variant-numeric: tabular-nums; }

/* ── Lower actions ────────────────────────────────────────────────────── */
.lower-actions {
  margin-bottom: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-edge);
}
.btn-rest-day {
  padding: 10px 20px;
  background: var(--color-surface-2); border: 1px solid var(--color-edge);
  border-radius: var(--radius-pill); color: var(--color-text-3);
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all 150ms;
}
.btn-rest-day:hover { border-color: var(--color-accent-ring); color: var(--color-text-2); background: var(--color-accent-tint); }
.rest-day-active {
  background: oklch(75% 0.19 55 / 0.14) !important;
  border-color: oklch(75% 0.19 55 / 0.55) !important;
  color: var(--color-ci) !important;
  box-shadow: 0 0 14px oklch(75% 0.19 55 / 0.25);
}
.rest-toast { top: 112px !important; }

/* ── Today log ────────────────────────────────────────────────────────── */
.today-log {
  margin-top: 4px;
  padding-top: 20px;
  border-top: 1px solid var(--color-edge);
}
.log-item {
  background: var(--color-surface-1); border: 1px solid var(--color-edge);
  border-radius: var(--radius-md); margin-bottom: 6px; overflow: hidden;
}
.log-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; background: none; border: none; cursor: pointer;
  width: 100%; -webkit-tap-highlight-color: transparent;
}
.log-left  { display: flex; align-items: center; gap: 10px; }
.log-right { display: flex; align-items: center; gap: 8px; }
.log-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 6px var(--color-accent-glow); flex-shrink: 0; }
.log-method { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.log-dur { font-size: 13px; font-weight: 700; color: var(--color-accent); font-variant-numeric: tabular-nums; }
.log-chevron { color: var(--color-text-4); flex-shrink: 0; }
.log-detail {
  padding: 10px 14px 12px; display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
  border-top: 1px solid var(--color-edge);
}
.log-time { font-size: 11px; color: var(--color-text-3); font-variant-numeric: tabular-nums; }
.log-actions { display: flex; gap: 6px; }
.log-action-btn {
  padding: 5px 12px; border-radius: var(--radius-pill);
  font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid;
  transition: opacity 150ms;
}
.log-action-btn:active { opacity: 0.7; }
.log-edit   { background: var(--color-accent-tint); border-color: var(--color-accent-ring); color: var(--color-accent); }
.log-delete { background: var(--color-critical-bg); border-color: var(--color-critical-bg); color: var(--color-critical); }

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
.time-edit-col { display: flex; flex-direction: column; gap: 6px; }
  .time-date-input { font-size: 13px; }
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

  /* ── Saved toast ──────────────────────────────────────────────────────── */
  .saved-toast {
    position: fixed; top: 72px; left: 50%; transform: translateX(-50%);
    z-index: 60; display: flex; align-items: center; gap: 8px;
    padding: 10px 20px;
    background: var(--color-positive-bg);
    border: 1px solid var(--color-positive-ring);
    border-radius: var(--radius-pill);
    font-size: 13px; font-weight: 700; color: var(--color-positive);
    white-space: nowrap;
    box-shadow: 0 4px 20px oklch(0% 0 0 / 0.4);
    pointer-events: none;
  }
  .saved-toast-check { font-size: 16px; }

  /* ── Goal toggle ──────────────────────────────────────────────────────── */
  .goal-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px;
    background: var(--color-surface-2); border: 1px solid var(--color-edge);
    border-radius: var(--radius-md);
  }
  .goal-toggle-info { display: flex; flex-direction: column; gap: 3px; }
  .goal-toggle-label { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
  .goal-toggle-hint  { font-size: 10px; color: var(--color-ci); font-weight: 600; }

  .toggle-btn {
    width: 44px; height: 26px; border-radius: 13px;
    background: var(--color-edge); border: none; cursor: pointer;
    position: relative; transition: background 250ms; flex-shrink: 0;
  }
  .toggle-btn.toggle-on { background: var(--color-accent); }
  .toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 20px; height: 20px; border-radius: 50%;
    background: white; transition: transform 250ms var(--ease-spring);
  }
  .toggle-btn.toggle-on .toggle-knob { transform: translateX(18px); }

  /* ── Past session preview ─────────────────────────────────────────────── */
  .past-dur-preview {
    text-align: center; padding: 8px 16px;
    background: var(--color-accent-tint); border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-pill); font-size: 14px; font-weight: 700;
    color: var(--color-accent);
  }
  .past-err { font-size: 11px; color: var(--color-critical); text-align: center; margin-top: 4px; }
  .time-error-msg { font-size: 11px; color: var(--color-critical);
    text-align: center; margin-top: 6px; font-weight: 600; }
  .time-success-banner {
    text-align: center; padding: 12px;
    background: var(--color-positive-bg); border: 1px solid var(--color-positive-ring);
    border-radius: var(--radius-md); font-size: 13px; font-weight: 700;
    color: var(--color-positive);
  }

  /* ── Live session card pulse ──────────────────────────────────────────── */
  .card-session-live {
    animation: session-pulse 2.8s ease-in-out infinite;
  }
  @keyframes session-pulse {
    0%, 100% {
      box-shadow:
        inset 0 1px 0 oklch(100% 0 0 / 0.06),
        0 0 0 1px var(--color-accent-ring),
        0 0 14px oklch(72% 0.22 292 / 0.15);
    }
    50% {
      box-shadow:
        inset 0 1px 0 oklch(100% 0 0 / 0.06),
        0 0 0 1px var(--color-accent),
        0 0 28px oklch(72% 0.22 292 / 0.35);
    }
  }

.ring-stage {
  display: flex; justify-content: center; align-items: center;
  padding: 4px 0;
  transition: opacity 1.2s ease, filter 1.2s ease;
}

  /* ── Milestone overlay ────────────────────────────────────────────────── */
  .milestone-overlay {
    position: fixed; inset: 0; z-index: 65;
    background: oklch(5% 0.02 280 / 0.93);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex; align-items: center; justify-content: center;
    padding: 32px; cursor: pointer;
  }
  .milestone-content {
    display: flex; flex-direction: column; align-items: center;
    gap: 18px; text-align: center; max-width: 300px;
  }
  .milestone-emoji {
    font-size: 76px; line-height: 1;
    filter: drop-shadow(0 0 36px oklch(75% 0.19 55 / 0.65));
    animation: ms-emoji-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes ms-emoji-pop {
    0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
    60%  { transform: scale(1.22) rotate(5deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  .milestone-title {
    font-family: var(--font-display); font-size: 30px; font-weight: 800;
    color: var(--color-ci); line-height: 1.1;
    text-shadow: 0 0 40px oklch(75% 0.19 55 / 0.5);
  }
  .milestone-msg {
    font-size: 15px; line-height: 1.75; color: var(--color-text-2); font-weight: 400;
  }
  .milestone-prog-wrap {
    width: 100%; height: 3px; background: oklch(100% 0 0 / 0.1);
    border-radius: var(--radius-pill); overflow: hidden; margin-top: 4px;
  }
  .milestone-prog-bar {
    height: 100%; background: var(--color-ci);
    border-radius: var(--radius-pill);
    animation: ms-drain 5.2s linear forwards;
  }
  @keyframes ms-drain { from { width: 100%; } to { width: 0%; } }
  .milestone-hint {
    font-size: 10px; color: var(--color-text-4); font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
</style>