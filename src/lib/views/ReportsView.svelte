<script>
  import { logs } from '$lib/stores/logs.js';
  import { char } from '$lib/stores/profile.js';

  // ── Time range filter ──────────────────────────────────────────────────
  let range      = $state('30D');
  let customFrom = $state('');
  let customTo   = $state('');
  const RANGES = ['7D', '30D', '90D', 'All', 'Custom'];

  // ── Method group → color (consistent across every chart) ──────────────
  const GROUPS = [
    { key:'devices',   label:'Devices',   ids:['tugger','dtr','cat2q','pud','tlc','dual'],                         color:'oklch(72% 0.22 292)' },
    { key:'manual',    label:'Manual',    ids:['m1','m2','m3','m4','m5'],                                          color:'oklch(72% 0.18 180)' },
    { key:'retaining', label:'Retaining', ids:['ret_manual','ret_device','ret_tape','ret_skin','packing'],         color:'oklch(75% 0.19 55)'  },
    { key:'inflation', label:'Inflation', ids:['inflation'],                                                       color:'oklch(72% 0.18 150)' },
    { key:'other',     label:'Other',     ids:[],                                                                   color:'oklch(62% 0.15 310)' },
  ];
  function grp(id) { return GROUPS.find(g => g.ids.includes(id)) ?? GROUPS[4]; }

  // ── Formatting helpers ─────────────────────────────────────────────────
  function fmtH(m) {
    if (!m || m <= 0) return '0m';
    if (m < 60) return `${Math.round(m)}m`;
    const hrs  = Math.floor(m / 60);
    const mins = Math.round(m % 60);
    if (mins === 0) return `${hrs}h`;
    if (mins < 5)   return `${hrs}h`;   // absorb tiny rounding dust
    return `${hrs}h ${mins}m`;
  }
  function dNAgo(n) {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  // ── Filtered non-rest logs ─────────────────────────────────────────────
  let fLogs = $derived((() => {
    const today = new Date().toISOString().slice(0, 10);
    return $logs.filter(l => {
      if (l.isRest) return false;
      if (range === 'All') return true;
      if (range === 'Custom') {
        const from = customFrom || '2000-01-01';
        const to   = customTo   || today;
        return l.date >= from && l.date <= to;
      }
      const days = range === '7D' ? 6 : range === '30D' ? 29 : 89;
      return l.date >= dNAgo(days) && l.date <= today;
    });
  })());

  // ── Summary metrics ────────────────────────────────────────────────────
  let totMins = $derived(fLogs.reduce((s,l) => s + (l.dur||0), 0));
  let totSess = $derived(fLogs.length);
  let actDays = $derived(new Set(fLogs.map(l => l.date)).size);
  let rDays = $derived((() => {
    if (range === 'All' || range === 'Custom') {
      if (!fLogs.length) return 1;
      const sorted = [...fLogs].sort((a, b) => a.date > b.date ? 1 : -1);
      const first  = new Date(sorted[0].date + 'T12:00:00').getTime();
      return Math.max(1, Math.ceil((Date.now() - first) / 86400000) + 1);
    }
    return range === '7D' ? 7 : range === '30D' ? 30 : 90;
  })());
  let consPct = $derived(Math.min(100, Math.round((actDays / rDays) * 100)));
  let avgDay  = $derived(actDays > 0 ? Math.round(totMins / actDays) : 0);
  let hasData = $derived(totMins > 0);

  // ── Method totals ──────────────────────────────────────────────────────
  let mTotals = $derived((() => {
    const m = {};
    for (const l of fLogs) {
      if (!m[l.method]) m[l.method] = { method:l.method, label:l.methodLabel??l.method, mins:0, count:0, grp:grp(l.method) };
      m[l.method].mins  += l.dur || 0;
      m[l.method].count += 1;
    }
    return Object.values(m).sort((a,b) => b.mins - a.mins);
  })());

  // ── Group totals for donut ─────────────────────────────────────────────
  let gTotals = $derived((() => {
    const g = {};
    for (const m of mTotals) {
      if (!g[m.grp.key]) g[m.grp.key] = { ...m.grp, mins:0 };
      g[m.grp.key].mins += m.mins;
    }
    return Object.values(g).filter(x => x.mins>0).sort((a,b)=>b.mins-a.mins);
  })());

  // ── Donut arcs ─────────────────────────────────────────────────────────
  const DR=52, DCX=76, DCY=76;
  const DC = +(2*Math.PI*DR).toFixed(2);
  let donutArcs = $derived((() => {
    if (!totMins) return [];
    let cum = 0;
    return gTotals.map(g => {
      const f = g.mins / totMins;
      const dash = Math.max(0, f*DC - 1.8);
      const rotation = -90 + cum*360;
      cum += f;
      return { ...g, dash, rotation, pct:Math.round(f*100) };
    });
  })());

  // ── Weekly bars ────────────────────────────────────────────────────────
  let wkBars = $derived((() => {
    const bars=[], today=new Date(); today.setHours(23,59,59,999);
    const dow=today.getDay();
    for (let w=7;w>=0;w--) {
      const end=new Date(today); end.setDate(today.getDate()-dow+6-w*7);
      const start=new Date(end); start.setDate(end.getDate()-6);
      const s=start.toISOString().slice(0,10), e=end.toISOString().slice(0,10);
      const mins=$logs.filter(l=>!l.isRest&&l.date>=s&&l.date<=e).reduce((sum,l)=>sum+(l.dur||0),0);
      bars.push({ label:w===0?'Now':start.toLocaleString('default',{month:'short',day:'numeric'}), mins, isCur:w===0 });
    }
    return bars;
  })());
  let wkGoal=$derived(($char.dailyGoalMin||480)*7);
  let maxWk=$derived(Math.max(...wkBars.map(w=>w.mins),wkGoal,1));
  let gy=$derived(98-(wkGoal/maxWk)*80);

  // ── Heatmap 84 days ───────────────────────────────────────────────────
  let hCells = $derived((() => {
    const lookup={};
    for (const l of $logs) {
      if (!lookup[l.date]) lookup[l.date]={mins:0,rest:false};
      if (l.isRest) lookup[l.date].rest=true;
      else          lookup[l.date].mins+=l.dur||0;
    }
    const goal=$char.dailyGoalMin||480, cells=[];
    for (let i=83;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      const str=d.toISOString().slice(0,10);
      const data=lookup[str]??{mins:0,rest:false};
      let t=0;
      if      (data.rest)             t=-1;
      else if (data.mins>=goal)       t=3;
      else if (data.mins>=goal*.5)    t=2;
      else if (data.mins>0)           t=1;
      cells.push({date:str,mins:data.mins,rest:data.rest,t,dow:d.getDay()});
    }
    return cells;
  })());
  let hCols = $derived((() => {
    const pad=hCells[0]?.dow??0, padded=[...Array(pad).fill(null),...hCells], cols=[];
    for (let i=0;i<padded.length;i+=7) cols.push(padded.slice(i,i+7));
    return cols;
  })());
  let hMonths = $derived((() => {
    const labels=[],seen=new Set();
    hCells.forEach((c,i)=>{
      const mo=c.date.slice(0,7);
      if (!seen.has(mo)) {
        seen.add(mo);
        const ci=Math.floor((i+(hCells[0]?.dow??0))/7);
        labels.push({ci,label:new Date(c.date).toLocaleString('default',{month:'short'})});
      }
    });
    return labels;
  })());

 // ── Week helpers ──────────────────────────────────────────────────────
  function getWeekStart(ref = new Date()) {
    const d = new Date(ref);
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function fmtShortDate(d) {
    return d.toLocaleString('default', { month: 'short', day: 'numeric' });
  }

  // ── Weekly Recap (always current week, ignores range filter) ──────────
  let weekRecap = $derived((() => {
    const mon  = getWeekStart();
    const sun  = new Date(mon.getTime() + 6 * 86400000);
    const s    = mon.toISOString().slice(0, 10);
    const e    = sun.toISOString().slice(0, 10);
    const wl   = $logs.filter(l => !l.isRest && l.date >= s && l.date <= e);
    const totalMins = wl.reduce((a, l) => a + (l.dur || 0), 0);
    const byDay = {};
    for (const l of wl) byDay[l.date] = (byDay[l.date] || 0) + (l.dur || 0);
    const goalMin = $char.dailyGoalMin || 480;
    const goldDays = Object.values(byDay).filter(m => m >= goalMin).length;
    const mTot = {};
    for (const l of wl) {
      if (!mTot[l.method]) mTot[l.method] = { label: l.methodLabel ?? l.method, mins: 0 };
      mTot[l.method].mins += l.dur || 0;
    }
    const topMethod = Object.values(mTot).sort((a, b) => b.mins - a.mins)[0];
    return { label: `${fmtShortDate(mon)} – ${fmtShortDate(sun)}`, sessions: wl.length, totalMins, goldDays, topMethod };
  })());

  // ── This Week daily bars ──────────────────────────────────────────────
  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let thisWeekBars = $derived((() => {
    const mon   = getWeekStart();
    const now   = new Date(); now.setHours(23, 59, 59, 999);
    const todDS = new Date().toISOString().slice(0, 10);
    return DAY_LABELS.map((lbl, i) => {
      const d      = new Date(mon.getTime() + i * 86400000);
      const ds     = d.toISOString().slice(0, 10);
      const dl     = $logs.filter(l => !l.isRest && l.date === ds);
      const mins   = dl.reduce((a, l) => a + (l.dur || 0), 0);
      const byM    = {};
      for (const l of dl) byM[l.method] = (byM[l.method] || 0) + (l.dur || 0);
      const top    = Object.entries(byM).sort((a, b) => b[1] - a[1])[0];
      return { lbl, date: fmtShortDate(d), mins, color: top ? grp(top[0]).color : null, isFuture: d > now, isToday: ds === todDS };
    });
  })());
  let twMax   = $derived(Math.max(...thisWeekBars.map(b => b.mins), $char.dailyGoalMin || 480, 1));
  let twGoalY = $derived(+(98 - (($char.dailyGoalMin || 480) / twMax) * 82).toFixed(1));

  // ── Calendar state ────────────────────────────────────────────────────
  let calYear  = $state(new Date().getFullYear());
  let calMonth = $state(new Date().getMonth());

  function calPrev() {
    if (calMonth === 0) { calYear -= 1; calMonth = 11; }
    else calMonth -= 1;
  }
  function calNext() {
    const n = new Date();
    if (calYear > n.getFullYear() || (calYear === n.getFullYear() && calMonth >= n.getMonth())) return;
    if (calMonth === 11) { calYear += 1; calMonth = 0; }
    else calMonth += 1;
  }
  let calIsAtCurrent = $derived((() => {
    const n = new Date();
    return calYear === n.getFullYear() && calMonth === n.getMonth();
  })());
  let calMonthLabel = $derived(
    new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const CAL_DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  let calDays = $derived((() => {
    const goalMin  = $char.dailyGoalMin || 480;
    const firstDay = new Date(calYear, calMonth, 1);
    const daysInMo = new Date(calYear, calMonth + 1, 0).getDate();
    let startDow   = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const lookup = {};
    for (const l of $logs) {
      if (!lookup[l.date]) lookup[l.date] = { mins: 0, rest: false };
      if (l.isRest) lookup[l.date].rest = true;
      else lookup[l.date].mins += l.dur || 0;
    }
    const now    = new Date(); now.setHours(23, 59, 59, 999);
    const todStr = new Date().toISOString().slice(0, 10);
    const cells  = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMo; d++) {
      const ds   = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = lookup[ds] ?? { mins: 0, rest: false };
      const date = new Date(calYear, calMonth, d);
      const isFut = date > now;
      let status = 'empty';
      if (!isFut) {
        if (data.rest)             status = 'rest';
        else if (data.mins >= goalMin) status = 'gold';
        else if (data.mins > 0)    status = 'active';
      }
      cells.push({ d, ds, mins: data.mins, rest: data.rest, status, isFut, isToday: ds === todStr });
    }
    return cells;
  })());

  // ── Day detail sheet ──────────────────────────────────────────────────
  let selectedDay     = $state(/** @type {any} */(null));
  let showDaySheet    = $state(false);
  let dayEntries      = $derived(selectedDay ? $logs.filter(l => l.date === selectedDay.ds && !l.isRest) : []);
  let selectedDayMins = $derived(dayEntries.reduce((s, l) => s + (l.dur || 0), 0));
  let selectedDayStatus = $derived((() => {
    if (!selectedDay) return 'empty';
    const goalMin = $char.dailyGoalMin || 480;
    const isRest  = $logs.some(l => l.date === selectedDay.ds && l.isRest);
    if (isRest) return 'rest';
    if (selectedDayMins >= goalMin) return 'gold';
    if (selectedDayMins > 0) return 'active';
    return 'empty';
  })());

  let editingCalEntry  = $state(/** @type {any} */(null));
  let editCalDur       = $state('');
  let editCalMethod    = $state(/** @type {any} */(null));
  let showEditCalSheet = $state(false);

  let ALL_METHODS_FLAT = $derived([
    { id:'tugger',label:'Tugger' },{ id:'dtr',label:'DTR' },{ id:'cat2q',label:'CAT II Q' },
    { id:'pud',label:'PUD' },{ id:'tlc',label:'TLC Tugger' },{ id:'dual',label:'Dual Restorer' },
    { id:'inflation',label:'Inflation' },{ id:'packing',label:'Packing' },
    { id:'m1',label:'M1' },{ id:'m2',label:'M2' },{ id:'m3',label:'M3' },{ id:'m4',label:'M4' },{ id:'m5',label:'M5' },
    ...($char.customMethods ?? []).map(m => ({ id: m.id, label: m.label })),
  ]);

  function openCalDay(cell) {
    if (!cell || cell.isFut) return;
    selectedDay  = cell;
    showDaySheet = true;
  }
  function deleteCalEntry(id) {
    const entry = $logs.find(l => l.id === id);
    if (!entry) return;
    char.update(c => ({
      ...c,
      totalMinutes: Math.max(0, (c.totalMinutes||0) - (entry.dur||0)),
      totalSessions: Math.max(0, (c.totalSessions||0) - 1),
    }));
    logs.remove(id);
  }
  function openEditCalEntry(entry) {
    editingCalEntry  = entry;
    editCalDur       = String(entry.dur || 1);
    editCalMethod    = { id: entry.method, label: entry.methodLabel ?? entry.method };
    showEditCalSheet = true;
  }
  function saveEditCalEntry() {
    if (!editingCalEntry) return;
    const dur  = Math.max(1, parseInt(editCalDur) || 1);
    const diff = dur - (editingCalEntry.dur || 0);
    logs.setAll($logs.map(l =>
      l.id === editingCalEntry.id
        ? { ...l, dur, method: editCalMethod?.id ?? l.method, methodLabel: editCalMethod?.label ?? l.methodLabel }
        : l
    ));
    char.update(c => ({ ...c, totalMinutes: (c.totalMinutes||0) + diff }));
    showEditCalSheet = false;
    editingCalEntry  = null;
  }

  // ── Smart Insight ──────────────────────────────────────────────────────
  let insight = $derived((() => {
    if (totSess<3) return '📊 Log a few more sessions to unlock your personalized insight.';
    const overall=totMins/totSess;
    const qualified=mTotals.filter(m=>m.count>=2);
    if (qualified.length>1) {
      const best=qualified.reduce((a,b)=>b.mins/b.count>a.mins/a.count?b:a);
      const bAvg=best.mins/best.count;
      if (bAvg>overall*1.3) return `${best.label} is your most committed method — avg session ${fmtH(Math.round(bAvg))} vs your overall avg of ${fmtH(Math.round(overall))}.`;
    }
    if (mTotals[0]) {
      const top=mTotals[0], pct=Math.round((top.mins/totMins)*100);
      return `${top.label} leads your log — ${pct}% of tracked time (${fmtH(top.mins)} total).`;
    }
    return '📊 Keep logging — your personalized insight will appear here.';
  })());
</script>

<div class="rv">

  <!-- ── Range selector ───────────────────────────────────────────── -->
  <div class="section-block">
  <div class="range-row">
    {#each RANGES as r}
      <button class="rpill" class:active={range === r} onclick={() => range = r}>{r}</button>
    {/each}
  </div>
  {#if range === 'Custom'}
    <div class="custom-range-row animate-fade-in">
      <div class="cr-group">
        <span class="cr-label">FROM</span>
        <input type="date" class="input-field cr-input"
          bind:value={customFrom}
          max={customTo || new Date().toISOString().slice(0,10)}
        />
      </div>
      <span class="cr-sep">→</span>
      <div class="cr-group">
        <span class="cr-label">TO</span>
        <input type="date" class="input-field cr-input"
          bind:value={customTo}
          min={customFrom}
          max={new Date().toISOString().slice(0,10)}
        />
      </div>
    </div>
  {/if}
  </div><!-- /section-block range -->

  <!-- ── Weekly Recap card ──────────────────────────────────────────── -->
  <div class="section-block">
  <p class="section-title">This Week</p>
  <div class="surface-card wkr-card card-accent-top card-featured">
    <div class="wkr-header">
      <span class="section-label" style="margin-bottom:0">Weekly Recap</span>
      <span class="wkr-range">{weekRecap.label}</span>
    </div>
    <div class="wkr-grid">
      <div class="wkr-cell">
        <span class="wkr-val" style="color:var(--color-accent)">{weekRecap.sessions}</span>
        <span class="wkr-key">Sessions</span>
      </div>
      <div class="wkr-cell">
        <span class="wkr-val" style="color:var(--color-health)">{fmtH(weekRecap.totalMins)}</span>
        <span class="wkr-key">Total TUT</span>
      </div>
      <div class="wkr-cell">
        <span class="wkr-val" style="color:var(--color-ci)">
          {weekRecap.goldDays}<span class="wkr-den">/7</span>
        </span>
        <span class="wkr-key">🥇 Gold Days</span>
      </div>
      <div class="wkr-cell">
        <span class="wkr-val wkr-method-val">{weekRecap.topMethod?.label ?? '—'}</span>
        <span class="wkr-key">Top Method</span>
      </div>
    </div>
  </div>
  </div><!-- /section-block weekly -->

  <!-- ── Activity Calendar ─────────────────────────────────────────── -->
  <div class="section-block">
  <p class="section-title">Activity</p>
  <div class="surface-card cc">
    <!-- Month/year nav -->
    <div class="cal-header">
      <button class="cal-nav-btn" onclick={calPrev}>‹</button>
      <span class="cal-month-label">{calMonthLabel}</span>
      <button class="cal-nav-btn" onclick={calNext} disabled={calIsAtCurrent}>›</button>
    </div>
    <!-- Day-of-week headers -->
    <div class="cal-dow-row">
      {#each CAL_DOW as d}<div class="cal-dow">{d}</div>{/each}
    </div>
    <!-- Day grid -->
    <div class="cal-grid">
      {#each calDays as cell}
        {#if cell === null}
          <div class="cal-cell cal-pad"></div>
        {:else}
          <button
            class="cal-cell"
            class:cal-gold={cell.status === 'gold'}
            class:cal-active={cell.status === 'active'}
            class:cal-rest={cell.status === 'rest'}
            class:cal-today={cell.isToday}
            class:cal-future={cell.isFut}
            onclick={() => openCalDay(cell)}
            disabled={cell.isFut}
          >
            <span class="cal-num">{cell.d}</span>
          </button>
        {/if}
      {/each}
    </div>
    <!-- Legend -->
    <div class="cal-legend">
      <span class="cal-leg-item"><span class="cal-ld cld-gold"></span>Goal met</span>
      <span class="cal-leg-item"><span class="cal-ld cld-active"></span>Active</span>
      <span class="cal-leg-item"><span class="cal-ld cld-rest"></span>Rest</span>
    </div>
  </div>

  <!-- ── Day Detail Sheet ──────────────────────────────────────────── -->
  {#if showDaySheet && selectedDay}
    <div class="cal-backdrop" role="dialog" aria-modal="true"
      tabindex="-1"
      onclick={() => showDaySheet = false}
      onkeydown={(e) => e.key === 'Escape' && (showDaySheet = false)}>
      <button class="backdrop-dismiss" onclick={() => showDaySheet = false} aria-label="Close"></button>
      <div class="sheet animate-slide-up">
        <div class="sheet-handle"></div>
        <div class="ds-head">
          <span class="ds-dow">
            {new Date(selectedDay.ds + 'T12:00:00').toLocaleString('default',{weekday:'long'})}
          </span>
          <span class="ds-date">
            {new Date(selectedDay.ds + 'T12:00:00').toLocaleString('default',{month:'long',day:'numeric',year:'numeric'})}
          </span>
        </div>
        <div class="ds-status-row">
          {#if selectedDayStatus === 'rest'}
            <span class="ds-pill ds-rest">🛌 Rest Day</span>
          {:else if selectedDayStatus === 'gold'}
            <span class="ds-pill ds-gold">🥇 Goal Met — {fmtH(selectedDayMins)}</span>
          {:else if selectedDayStatus === 'active'}
            <span class="ds-pill ds-active">⚡ Active — {fmtH(selectedDayMins)}</span>
          {:else}
            <span class="ds-pill ds-empty">No activity logged</span>
          {/if}
        </div>
        <div class="divider"></div>
        {#if dayEntries.length > 0}
          <p class="section-label" style="margin-bottom:10px">Sessions</p>
          {#each dayEntries as entry (entry.id)}
            <div class="ds-entry">
              <div class="ds-info">
                <span class="ds-method">{entry.methodLabel ?? entry.method}</span>
                <span class="ds-dur">{fmtH(entry.dur)}</span>
              </div>
              <div class="ds-btns">
                <button class="ds-btn ds-edit" onclick={() => openEditCalEntry(entry)}>✏</button>
                <button class="ds-btn ds-del"  onclick={() => deleteCalEntry(entry.id)}>🗑</button>
              </div>
            </div>
          {/each}
        {:else if selectedDay.status !== 'rest'}
          <p class="ds-empty-msg">No sessions recorded for this day.</p>
        {/if}
        <button class="btn-ghost" style="margin-top:20px;width:100%" onclick={() => showDaySheet = false}>Close</button>
      </div>
    </div>
  {/if}

  <!-- ── Edit Calendar Entry ────────────────────────────────────────── -->
  {#if showEditCalSheet && editingCalEntry}
    <div class="cal-backdrop" role="dialog" aria-modal="true"
      tabindex="-1"
      onclick={() => showEditCalSheet = false}
      onkeydown={(e) => e.key === 'Escape' && (showEditCalSheet = false)}>
      <button class="backdrop-dismiss" onclick={() => showEditCalSheet = false} aria-label="Close"></button>
      <div class="sheet animate-slide-up">
        <div class="sheet-handle"></div>
        <h2 class="cal-edit-title">Edit Session</h2>
        <p class="section-label" style="margin-bottom:6px">Duration (minutes)</p>
        <div style="position:relative;display:flex;align-items:center;margin-bottom:20px">
          <input type="number" class="input-field"
            style="font-size:24px;font-weight:800;text-align:center;padding:14px 50px 14px 14px;font-variant-numeric:tabular-nums"
            bind:value={editCalDur} min="1"
          />
          <span style="position:absolute;right:14px;font-size:13px;font-weight:600;color:var(--color-text-3)">min</span>
        </div>
        <p class="section-label" style="margin-bottom:8px">Method</p>
        <div class="ce-pills">
          {#each ALL_METHODS_FLAT as m}
            <button class="ce-pill" class:ce-pill-sel={editCalMethod?.id === m.id}
              onclick={() => editCalMethod = m}>{m.label}</button>
          {/each}
        </div>
        <button class="btn-primary" style="margin-top:20px" onclick={saveEditCalEntry}>Save Changes</button>
        <button class="btn-ghost"   style="margin-top:8px"  onclick={() => showEditCalSheet = false}>Cancel</button>
      </div>
    </div>
  {/if}
</div>

<!-- ── This Week daily bars ──────────────────────────────────────── -->
  <div class="surface-card cc card-health-top">
    <div class="cc-hdr">
      <span class="section-label" style="margin-bottom:0">This Week</span>
      <span class="cc-sub">{thisWeekBars[0]?.date} – {thisWeekBars[6]?.date}</span>
    </div>
    <svg viewBox="0 0 252 122" class="wk-svg" aria-hidden="true">
      <!-- Grid lines -->
      {#each [0.25,0.5,0.75,1] as f}
        <line x1="0" y1={+(98-f*82).toFixed(1)} x2="252" y2={+(98-f*82).toFixed(1)}
          stroke="var(--color-edge)" stroke-width="0.5" opacity="0.6"/>
      {/each}
      <!-- Daily goal line -->
      <line x1="0" y1={twGoalY} x2="252" y2={twGoalY}
        stroke="var(--color-ci)" stroke-width="1" stroke-dasharray="4 3" opacity="0.65"/>
      <text x="250" y={twGoalY - 3} class="svgt goal-t" text-anchor="end">goal</text>
      <!-- Bars -->
      {#each thisWeekBars as bar, i}
        {@const bh  = Math.max(bar.mins > 0 ? 4 : 0, (bar.mins / twMax) * 82)}
        {@const bx  = i * 36 + 2}
        {@const by  = 98 - bh}
        {@const fill = bar.isFuture ? 'var(--color-surface-2)' : (bar.color ?? 'var(--color-surface-3)')}
        <rect x={bx} y={by} width="30" height={bh} rx="5"
          fill={fill} opacity={bar.isFuture ? 0.3 : 1}/>
        {#if bar.isToday}
          <rect x={bx} y="101" width="30" height="3" rx="1.5"
            fill="var(--color-accent)" opacity="0.7"/>
        {/if}
        {#if bar.mins > 0}
          <text x={bx+15} y={by-4} class="svgt bv-t" text-anchor="middle">{fmtH(bar.mins)}</text>
        {/if}
        <text x={bx+15} y="118" class="svgt bl-t" text-anchor="middle">{bar.lbl}</text>
      {/each}
    </svg>
    {#if thisWeekBars.some(b => b.color)}
      <div class="tw-legend">
        <span class="tw-hint">bar color = top method used that day</span>
      </div>
    {/if}
  </div>

  <!-- ── Method Breakdown — ALWAYS RENDERED ───────────────────────── -->
  <div class="surface-card cc card-accent-top">
    <span class="section-label">Method Breakdown</span>
    {#if hasData}
      <div class="mb-row">
        <svg viewBox="0 0 152 152" class="donut-svg" aria-hidden="true">
          <circle cx={DCX} cy={DCY} r={DR} fill="none" stroke="var(--color-edge)" stroke-width="20"/>
          {#each donutArcs as arc}
            <circle cx={DCX} cy={DCY} r={DR} fill="none"
              stroke={arc.color} stroke-width="20"
              stroke-dasharray="{arc.dash} {DC}"
              stroke-linecap="butt"
              transform="rotate({arc.rotation} {DCX} {DCY})"/>
          {/each}
          {#if donutArcs[0]}
            <text x={DCX} y={DCY+7}  text-anchor="middle" class="svgt dp-t">{donutArcs[0].pct}%</text>
            <text x={DCX} y={DCY+21} text-anchor="middle" class="svgt ds-t">{donutArcs[0].label}</text>
          {/if}
        </svg>
        <div class="d-legend">
          {#each gTotals as g}
            <div class="dl-row">
              <span class="dl-dot" style="background:{g.color}"></span>
              <span class="dl-lbl">{g.label}</span>
              <span class="dl-val">{fmtH(g.mins)}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <span class="empty-icon">◑</span>
        <span class="empty-txt">No sessions logged for this range yet</span>
      </div>
    {/if}
  </div>

  <!-- ── Time per Method — ALWAYS RENDERED ────────────────────────── -->
  <div class="surface-card cc card-accent-top">
    <span class="section-label">Time per Method</span>
    {#if hasData && mTotals.length > 0}
      <div class="mt-bars">
        {#each mTotals.slice(0,6) as m}
          {@const pct=Math.round((m.mins/mTotals[0].mins)*100)}
          <div class="mt-row">
            <span class="mt-lbl">{m.label}</span>
            <div class="mt-track">
              <div class="mt-fill" style="width:{pct}%;background:{m.grp.color}"></div>
            </div>
            <span class="mt-val">{fmtH(m.mins)}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <span class="empty-icon">▦</span>
        <span class="empty-txt">Log sessions to see method breakdown</span>
      </div>
    {/if}
  </div>



  <!-- ── Smart Insight ─────────────────────────────────────────────── -->
  <div class="surface-violet ins-card animate-slide-up card-featured-ci">
    <span class="ins-icon">💡</span>
    <p class="ins-txt">{insight}</p>
  </div>

</div>

<style>
  .rv { display:flex; flex-direction:column; gap:12px; padding-bottom:16px; }

  .range-row { display:flex; gap:6px; }
  .rpill {
    flex:1; padding:8px 4px; background:var(--color-surface-2);
    border:1px solid var(--color-edge); border-radius:var(--radius-pill);
    font-size:12px; font-weight:700; color:var(--color-text-3);
    cursor:pointer; transition:all 150ms; text-align:center;
  }
  .rpill.active { background:var(--color-accent-tint); border-color:var(--color-accent-ring); color:var(--color-accent); }

  /* Weekly Recap */
  .wkr-card { padding:16px; }
  .wkr-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .wkr-range { font-size:11px; font-weight:600; color:var(--color-text-3); }
  .wkr-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .wkr-cell { display:flex; flex-direction:column; align-items:center; gap:5px; padding:12px 8px;
    background:var(--color-surface-2); border:1px solid var(--color-edge);
    border-radius:var(--radius-md); text-align:center; }
  .wkr-val { font-size:20px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
  .wkr-den { font-size:12px; font-weight:600; color:var(--color-text-3); }
  .wkr-key { font-size:9px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-3); }
  .wkr-method-val { font-size:14px !important; color:var(--color-accent); }

  .cc { padding:16px; }
  .cc-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .cc-sub { font-size:10px; color:var(--color-text-4); }

  /* Empty states — always takes up space so the card doesn't collapse */
  .empty-state {
    display:flex; flex-direction:column; align-items:center; gap:8px;
    padding:28px 0; opacity:0.45;
  }
  .empty-icon { font-size:28px; line-height:1; }
  .empty-txt { font-size:12px; color:var(--color-text-3); text-align:center; max-width:200px; }

  :global(.svgt)   { font-family:'Inter Variable',sans-serif; }
  :global(.goal-t) { font:700 8px 'Inter Variable',sans-serif; fill:var(--color-ci); }
  :global(.bv-t)   { font:700 8px 'Inter Variable',sans-serif; fill:var(--color-text-3); }
  :global(.bl-t)   { font:600 7px 'Inter Variable',sans-serif; fill:var(--color-text-4); }
  :global(.dp-t)   { font:800 20px 'Inter Variable',sans-serif; fill:var(--color-text-1); font-variant-numeric:tabular-nums; }
  :global(.ds-t)   { font:600 10px 'Inter Variable',sans-serif; fill:var(--color-text-3); letter-spacing:0.03em; }

  .wk-svg { width:100%; display:block; overflow:visible; }
  .tw-legend { margin-top:8px; }
  .tw-hint { font-size:9px; color:var(--color-text-4); font-weight:600; }

  .mb-row { display:flex; align-items:center; gap:14px; }
  .donut-svg { width:130px; height:130px; flex-shrink:0; }
  .d-legend { flex:1; display:flex; flex-direction:column; gap:9px; min-width:0; }
  .dl-row { display:flex; align-items:center; gap:7px; }
  .dl-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .dl-lbl { font-size:11px; font-weight:600; color:var(--color-text-2); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .dl-val { font-size:11px; font-weight:700; color:var(--color-text-1); font-variant-numeric:tabular-nums; flex-shrink:0; }

  .mt-bars { display:flex; flex-direction:column; gap:10px; }
  .mt-row { display:flex; align-items:center; gap:8px; }
  .mt-lbl { font-size:11px; font-weight:600; color:var(--color-text-2); width:68px; flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .mt-track { flex:1; height:8px; background:var(--color-surface-3); border-radius:var(--radius-pill); overflow:hidden; }
  .mt-fill { height:100%; border-radius:var(--radius-pill); transition:width 600ms cubic-bezier(.34,1.56,.64,1); }
  .mt-val { font-size:11px; font-weight:700; color:var(--color-text-2); font-variant-numeric:tabular-nums; width:34px; text-align:right; flex-shrink:0; }

/* ── Custom Calendar ──────────────────────────────────────────────── */
  .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .cal-month-label { font-size:14px; font-weight:700; color:var(--color-text-1); }
  .cal-nav-btn {
    width:32px; height:32px; border-radius:50%;
    background:var(--color-surface-2); border:1px solid var(--color-edge);
    color:var(--color-text-2); font-size:18px; line-height:1;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all 150ms;
  }
  .cal-nav-btn:hover:not(:disabled) { background:var(--color-accent-tint); border-color:var(--color-accent-ring); color:var(--color-accent); }
  .cal-nav-btn:disabled { opacity:0.25; cursor:default; }
  .cal-dow-row { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:5px; }
  .cal-dow { font-size:9px; font-weight:700; text-align:center; color:var(--color-text-4); text-transform:uppercase; padding:2px 0; }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
  .cal-cell {
    aspect-ratio:1; border-radius:var(--radius-sm);
    background:var(--color-surface-2); border:1px solid transparent;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 150ms;
  }
  .cal-cell:hover:not(:disabled):not(.cal-future):not(.cal-pad) { border-color:var(--color-accent-ring); }
  .cal-cell:disabled { cursor:default; }
  .cal-pad    { background:transparent; cursor:default; }
  .cal-future { opacity:0.2; cursor:default; }
  .cal-today  { outline:2px solid var(--color-accent); outline-offset:-2px; }
  .cal-gold   { background:oklch(72% 0.22 292 / 0.25); border-color:oklch(72% 0.22 292 / 0.5); box-shadow:0 0 7px oklch(72% 0.22 292 / 0.3); }
  .cal-active { background:oklch(72% 0.18 180 / 0.2); border-color:oklch(72% 0.18 180 / 0.4); }
  .cal-rest   { background:oklch(75% 0.19 55 / 0.18); border-color:oklch(75% 0.19 55 / 0.4); }
  .cal-num { font-size:11px; font-weight:700; color:var(--color-text-2); }
  .cal-gold   .cal-num { color:var(--color-accent); }
  .cal-active .cal-num { color:var(--color-health); }
  .cal-rest   .cal-num { color:var(--color-ci); }
  .cal-legend { display:flex; gap:14px; justify-content:center; margin-top:10px; }
  .cal-leg-item { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:600; color:var(--color-text-3); }
  .cal-ld { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .cld-gold   { background:oklch(72% 0.22 292 / 0.7); }
  .cld-active { background:oklch(72% 0.18 180 / 0.55); }
  .cld-rest   { background:oklch(75% 0.19 55 / 0.55); }

  /* ── Day detail / Edit sheets ─────────────────────────────────────── */
  .cal-backdrop {
    position:fixed; inset:0; background:oklch(0% 0 0 / 0.78); backdrop-filter:blur(4px);
    z-index:55; display:flex; align-items:flex-end; justify-content:center;
    max-width:480px; margin:0 auto;
  }
  .cal-edit-title { font-family:var(--font-display); font-size:18px; font-weight:700; text-align:center; margin-bottom:20px; color:var(--color-text-1); }
  .ds-head { text-align:center; margin-bottom:12px; }
  .ds-dow  { display:block; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-3); margin-bottom:4px; }
  .ds-date { display:block; font-size:18px; font-weight:700; color:var(--color-text-1); font-family:var(--font-display); }
  .ds-status-row { display:flex; justify-content:center; margin-bottom:14px; }
  .ds-pill { padding:7px 18px; border-radius:var(--radius-pill); font-size:12px; font-weight:700; border:1px solid; }
  .ds-gold   { background:oklch(72% 0.22 292 / 0.12); border-color:oklch(72% 0.22 292 / 0.4); color:var(--color-accent); }
  .ds-active { background:oklch(72% 0.18 180 / 0.1); border-color:oklch(72% 0.18 180 / 0.35); color:var(--color-health); }
  .ds-rest   { background:oklch(75% 0.19 55 / 0.1); border-color:oklch(75% 0.19 55 / 0.35); color:var(--color-ci); }
  .ds-empty  { background:var(--color-surface-2); border-color:var(--color-edge); color:var(--color-text-3); }
  .ds-entry  { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--color-surface-2); border:1px solid var(--color-edge); border-radius:var(--radius-md); margin-bottom:8px; }
  .ds-info   { display:flex; flex-direction:column; gap:3px; }
  .ds-method { font-size:13px; font-weight:700; color:var(--color-text-1); }
  .ds-dur    { font-size:11px; font-weight:600; color:var(--color-accent); font-variant-numeric:tabular-nums; }
  .ds-btns   { display:flex; gap:6px; }
  .ds-btn    { width:34px; height:34px; border-radius:var(--radius-pill); border:1px solid; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity 150ms; }
  .ds-btn:active { opacity:0.7; }
  .ds-edit   { background:var(--color-accent-tint); border-color:var(--color-accent-ring); }
  .ds-del    { background:var(--color-critical-bg); border-color:var(--color-critical-bg); }
  .ds-empty-msg { font-size:12px; color:var(--color-text-4); text-align:center; padding:16px 0; }
  .ce-pills  { display:flex; flex-wrap:wrap; gap:6px; }
  .ce-pill   { padding:7px 15px; background:var(--color-surface-3); border:1px solid var(--color-edge); border-radius:var(--radius-pill); font-size:12px; font-weight:600; color:var(--color-text-2); cursor:pointer; transition:all 150ms; }
  .ce-pill:hover { border-color:var(--color-accent-ring); color:var(--color-text-1); }
  .ce-pill-sel { background:var(--color-accent-tint); border-color:var(--color-accent-ring); color:var(--color-accent); }

  .ins-card { display:flex; align-items:flex-start; gap:12px; padding:16px; border-radius:var(--radius-lg); }
  .ins-icon { font-size:20px; flex-shrink:0; line-height:1.4; }
  .ins-txt { font-size:13px; line-height:1.65; color:var(--color-text-2); }

  /* ── Custom date range picker ──────────────────────────────────────── */
  .custom-range-row {
    display: flex; align-items: flex-end; gap: 10px;
    padding: 12px 14px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-accent-ring);
    border-radius: var(--radius-md);
    margin-top: -4px;
  }
  .cr-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .cr-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: var(--color-text-3); }
  .cr-input { padding: 9px 10px; font-size: 12px; color-scheme: dark; }
  .cr-sep { font-size: 16px; color: var(--color-text-4); padding-bottom: 8px; flex-shrink: 0; }
</style>
