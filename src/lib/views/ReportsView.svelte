<script>
  import { logs } from '$lib/stores/logs.js';
  import { char } from '$lib/stores/profile.js';

  // ── Time range filter ──────────────────────────────────────────────────
  let range = $state('30D');
  const RANGES = ['7D', '30D', '90D', 'All'];

  // ── Method group → color (consistent across every chart) ──────────────
  const GROUPS = [
    { key:'devices',   label:'Devices',   ids:['tugger','dtr','cat2q','pud','tlc','dual'], color:'oklch(72% 0.22 292)' },
    { key:'manual',    label:'Manual',    ids:['m1','m2','m3','m4','m5'],                  color:'oklch(72% 0.18 180)' },
    { key:'packing',   label:'Packing',   ids:['packing'],                                color:'oklch(75% 0.19 55)'  },
    { key:'inflation', label:'Inflation', ids:['inflation'],                              color:'oklch(72% 0.18 150)' },
    { key:'other',     label:'Other',     ids:[],                                          color:'oklch(62% 0.15 310)' },
  ];
  function grp(id) { return GROUPS.find(g => g.ids.includes(id)) ?? GROUPS[4]; }

  // ── Formatting helpers ─────────────────────────────────────────────────
  function fmtH(m) {
    if (!m) return '0h';
    const h = m / 60;
    if (h < 1) return `${Math.round(m)}m`;
    return (h % 1 < 0.05) ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
  }
  function dNAgo(n) {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  // ── Filtered non-rest logs (driven by range selector) ─────────────────
  let fLogs = $derived($logs.filter(l => {
    if (l.isRest) return false;
    if (range === 'All') return true;
    return l.date >= dNAgo(range === '7D' ? 6 : range === '30D' ? 29 : 89);
  }));

  // ── Summary metrics ────────────────────────────────────────────────────
  let totMins  = $derived(fLogs.reduce((s, l) => s + (l.dur || 0), 0));
  let totSess  = $derived(fLogs.length);
  let actDays  = $derived(new Set(fLogs.map(l => l.date)).size);
  let rDays    = $derived(
    range === 'All'
      ? (fLogs.length
          ? Math.max(1, Math.ceil(
              (Date.now() - new Date([...fLogs].sort((a,b) => a.date > b.date ? 1 : -1)[0].date).getTime())
              / 86400000) + 1)
          : 1)
      : (range === '7D' ? 7 : range === '30D' ? 30 : 90)
  );
  let consPct  = $derived(Math.min(100, Math.round((actDays / rDays) * 100)));
  let avgDay   = $derived(actDays > 0 ? Math.round(totMins / actDays) : 0);

  // ── Method totals (filtered) ───────────────────────────────────────────
  let mTotals = $derived((() => {
    const m = {};
    for (const l of fLogs) {
      if (!m[l.method]) m[l.method] = { method:l.method, label:l.methodLabel ?? l.method, mins:0, count:0, grp:grp(l.method) };
      m[l.method].mins  += l.dur || 0;
      m[l.method].count += 1;
    }
    return Object.values(m).sort((a, b) => b.mins - a.mins);
  })());

  // ── Group totals for donut ─────────────────────────────────────────────
  let gTotals = $derived((() => {
    const g = {};
    for (const m of mTotals) {
      if (!g[m.grp.key]) g[m.grp.key] = { ...m.grp, mins: 0 };
      g[m.grp.key].mins += m.mins;
    }
    return Object.values(g).filter(x => x.mins > 0).sort((a, b) => b.mins - a.mins);
  })());

  // ── Donut chart (rotation-based, clean math) ───────────────────────────
  const DR = 52, DCX = 76, DCY = 76;
  const DC = +(2 * Math.PI * DR).toFixed(2); // ≈ 326.73

  let donutArcs = $derived((() => {
    if (!totMins) return [];
    let cum = 0;
    return gTotals.map(g => {
      const f = g.mins / totMins;
      const dash = Math.max(0, f * DC - 1.8); // tiny gap between segments
      const rotation = -90 + cum * 360;       // rotate each arc to its start position
      cum += f;
      return { ...g, dash, rotation, pct: Math.round(f * 100) };
    });
  })());

  // ── Weekly bars — always 8 calendar weeks, uses ALL logs ──────────────
  let wkBars = $derived((() => {
    const bars = [];
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const dow = today.getDay(); // 0=Sun
    for (let w = 7; w >= 0; w--) {
      const end   = new Date(today); end.setDate(today.getDate() - dow + 6 - w * 7);
      const start = new Date(end);  start.setDate(end.getDate() - 6);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const mins = $logs.filter(l => !l.isRest && l.date >= s && l.date <= e)
                        .reduce((sum, l) => sum + (l.dur || 0), 0);
      bars.push({
        label: w === 0 ? 'Now' : start.toLocaleString('default', { month:'short', day:'numeric' }),
        mins,
        isCur: w === 0,
      });
    }
    return bars; // [0] = oldest, [7] = current week
  })());

  let wkGoal  = $derived(($char.dailyGoalMin || 480) * 7);
  let maxWk   = $derived(Math.max(...wkBars.map(w => w.mins), wkGoal, 1));

  // ── Activity heatmap — 84 days ─────────────────────────────────────────
  let hCells = $derived((() => {
    const lookup = {};
    for (const l of $logs) {
      if (!lookup[l.date]) lookup[l.date] = { mins: 0, rest: false };
      if (l.isRest) lookup[l.date].rest = true;
      else          lookup[l.date].mins += l.dur || 0;
    }
    const goal = $char.dailyGoalMin || 480;
    const cells = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const str  = d.toISOString().slice(0, 10);
      const data = lookup[str] ?? { mins: 0, rest: false };
      let t = 0;
      if      (data.rest)              t = -1; // rest day
      else if (data.mins >= goal)      t =  3; // goal met
      else if (data.mins >= goal * .5) t =  2; // halfway
      else if (data.mins > 0)          t =  1; // some activity
      cells.push({ date: str, mins: data.mins, rest: data.rest, t, dow: d.getDay() });
    }
    return cells;
  })());

  // Pad first column so days land on correct row (0=Sun … 6=Sat)
  let hCols = $derived((() => {
    const pad    = hCells[0]?.dow ?? 0;
    const padded = [...Array(pad).fill(null), ...hCells];
    const cols   = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
    return cols;
  })());

  // Month labels: first column index where each new month starts
  let hMonths = $derived((() => {
    const labels = []; const seen = new Set();
    hCells.forEach((c, i) => {
      const mo = c.date.slice(0, 7);
      if (!seen.has(mo)) {
        seen.add(mo);
        const ci = Math.floor((i + (hCells[0]?.dow ?? 0)) / 7);
        labels.push({ ci, label: new Date(c.date).toLocaleString('default', { month: 'short' }) });
      }
    });
    return labels;
  })());

  // ── Smart Insight ──────────────────────────────────────────────────────
  let insight = $derived((() => {
    if (totSess < 3) return '📊 Log a few more sessions to unlock your personalized insight.';
    const overall = totMins / totSess;
    const qualified = mTotals.filter(m => m.count >= 2);
    if (qualified.length > 1) {
      const best = qualified.reduce((a, b) => (b.mins / b.count > a.mins / a.count ? b : a));
      const bAvg = best.mins / best.count;
      if (bAvg > overall * 1.3) {
        return `${best.label} is your most committed method — avg session ${fmtH(Math.round(bAvg))} vs your overall avg of ${fmtH(Math.round(overall))}.`;
      }
    }
    if (mTotals[0]) {
      const top = mTotals[0];
      const pct = Math.round((top.mins / totMins) * 100);
      return `${top.label} leads your log — ${pct}% of tracked time (${fmtH(top.mins)} total).`;
    }
    return '📊 Keep logging — your personalized insight will appear here.';
  })());
</script>

<div class="rv">

  <!-- ── Range selector ───────────────────────────────────────────── -->
  <div class="range-row">
    {#each RANGES as r}
      <button class="rpill" class:active={range === r} onclick={() => range = r}>{r}</button>
    {/each}
  </div>

  <!-- ── Summary cards ────────────────────────────────────────────── -->
  <div class="sum-grid">
    <div class="sc surface-card">
      <span class="sc-val gradient-text-violet">{fmtH(totMins)}</span>
      <span class="sc-key">Total TUT</span>
    </div>
    <div class="sc surface-card">
      <span class="sc-val gradient-text-health">{fmtH(avgDay)}</span>
      <span class="sc-key">Avg / Active Day</span>
    </div>
    <div class="sc surface-card">
      <span class="sc-val" style="color:var(--color-ci)">
        {actDays}<span class="sc-den">/{rDays}d</span>
      </span>
      <span class="sc-key">Active Days</span>
    </div>
    <div class="sc surface-card">
      <span class="sc-val" style="color:{consPct>=70?'var(--color-positive)':consPct>=40?'var(--color-ci)':'var(--color-critical)'}">
        {consPct}%
      </span>
      <span class="sc-key">Consistency</span>
    </div>
  </div>

  <!-- ── Weekly bar chart ─────────────────────────────────────────── -->
  <div class="surface-card cc">
    <div class="cc-hdr">
      <span class="section-label" style="margin-bottom:0">Weekly Volume</span>
      <span class="cc-sub">last 8 weeks · all time</span>
    </div>
    <svg viewBox="0 0 284 120" class="wk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="var(--color-accent-hi)"/>
          <stop offset="100%" stop-color="var(--color-accent-lo)"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      {#each [0.25, 0.5, 0.75, 1] as f}
        <line x1="2" y1={98 - f*80} x2="282" y2={98 - f*80}
          stroke="var(--color-edge)" stroke-width="0.5" opacity="0.7"/>
      {/each}
      <!-- Weekly goal pace line -->
      {@const gy = 98 - (wkGoal / maxWk) * 80}
      <line x1="2" y1={gy} x2="282" y2={gy}
        stroke="var(--color-ci)" stroke-width="1" stroke-dasharray="4 3" opacity="0.65"/>
      <text x="280" y={gy - 3} class="svgt goal-t" text-anchor="end">goal</text>
      <!-- Bars -->
      {#each wkBars as wk, i}
        {@const bh = Math.max(3, (wk.mins / maxWk) * 80)}
        {@const bx = 2 + i * 35}
        {@const by = 98 - bh}
        <rect x={bx} y={by} width="28" height={bh} rx="5"
          fill={wk.isCur ? 'url(#wkGrad)' : 'var(--color-surface-3)'}
          class="wk-bar"
        />
        {#if wk.mins > 0}
          <text x={bx + 14} y={by - 4} class="svgt bv-t" text-anchor="middle">
            {wk.mins >= 60 ? (wk.mins/60).toFixed(1)+'h' : wk.mins+'m'}
          </text>
        {/if}
        {#if i % 2 === 0}
          <text x={bx + 14} y="116" class="svgt bl-t" text-anchor="middle">{wk.label}</text>
        {/if}
      {/each}
    </svg>
  </div>

  <!-- ── Method breakdown (donut + legend) ────────────────────────── -->
  {#if totMins > 0}
  <div class="surface-card cc">
    <span class="section-label">Method Breakdown</span>
    <div class="mb-row">
      <!-- Donut -->
      <svg viewBox="0 0 152 152" class="donut-svg" aria-hidden="true">
        <!-- Track ring -->
        <circle cx={DCX} cy={DCY} r={DR} fill="none"
          stroke="var(--color-edge)" stroke-width="20"/>
        <!-- Colored arcs -->
        {#each donutArcs as arc}
          <circle cx={DCX} cy={DCY} r={DR} fill="none"
            stroke={arc.color} stroke-width="20"
            stroke-dasharray="{arc.dash} {DC}"
            stroke-linecap="butt"
            transform="rotate({arc.rotation} {DCX} {DCY})"
          />
        {/each}
        <!-- Center text -->
        {#if donutArcs[0]}
          <text x={DCX} y={DCY + 7}  text-anchor="middle" class="svgt dp-t">{donutArcs[0].pct}%</text>
          <text x={DCX} y={DCY + 21} text-anchor="middle" class="svgt ds-t">{donutArcs[0].label}</text>
        {:else}
          <text x={DCX} y={DCY + 7} text-anchor="middle" class="svgt ds-t">No data</text>
        {/if}
      </svg>
      <!-- Legend -->
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
  </div>
  {/if}

  <!-- ── Time per method (horizontal bars) ────────────────────────── -->
  {#if mTotals.length > 0}
  <div class="surface-card cc">
    <span class="section-label">Time per Method</span>
    <div class="mt-bars">
      {#each mTotals.slice(0, 6) as m}
        {@const pct = Math.round((m.mins / mTotals[0].mins) * 100)}
        <div class="mt-row">
          <span class="mt-lbl">{m.label}</span>
          <div class="mt-track">
            <div class="mt-fill" style="width:{pct}%; background:{m.grp.color}"></div>
          </div>
          <span class="mt-val">{fmtH(m.mins)}</span>
        </div>
      {/each}
    </div>
  </div>
  {/if}

  <!-- ── Activity heatmap (84 days, scrollable) ───────────────────── -->
  <div class="surface-card cc">
    <span class="section-label">Activity — Last 12 Weeks</span>
    <div class="hm-scroll">
      <div class="hm-inner">
        <!-- Month labels row -->
        <div class="hm-months">
          {#each hCols as _, ci}
            <div class="hm-mcell">
              {#each hMonths.filter(m => m.ci === ci) as mo}
                <span class="hm-mlbl">{mo.label}</span>
              {/each}
            </div>
          {/each}
        </div>
        <!-- Grid body -->
        <div class="hm-grid">
          <!-- Day-of-week labels -->
          <div class="hm-dow">
            {#each ['', 'M', '', 'W', '', 'F', ''] as d}
              <div class="hm-dl">{d}</div>
            {/each}
          </div>
          <!-- Week columns -->
          {#each hCols as col}
            <div class="hm-col">
              {#each Array(7) as _, row}
                {@const cell = col[row]}
                {#if cell}
                  <div class="hc"
                    class:t0={cell.t === 0}
                    class:t1={cell.t === 1}
                    class:t2={cell.t === 2}
                    class:t3={cell.t === 3}
                    class:tr={cell.t === -1}
                    title="{cell.date}: {cell.rest ? 'Rest day' : fmtH(cell.mins)}"
                  ></div>
                {:else}
                  <div class="hc te"></div>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        <!-- Legend -->
        <div class="hm-leg">
          <span class="hm-ll">Less</span>
          <div class="hc t0"></div>
          <div class="hc t1"></div>
          <div class="hc t2"></div>
          <div class="hc t3"></div>
          <span class="hm-ll">More</span>
          <div class="hc tr" style="margin-left:8px"></div>
          <span class="hm-ll">Rest</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Smart insight card ────────────────────────────────────────── -->
  <div class="surface-violet ins-card animate-slide-up">
    <span class="ins-icon">💡</span>
    <p class="ins-txt">{insight}</p>
  </div>

</div>

<style>
  .rv { display:flex; flex-direction:column; gap:12px; padding-bottom:16px; }

  /* ── Range pills ──────────────────────────────────────────────── */
  .range-row { display:flex; gap:6px; }
  .rpill {
    flex:1; padding:8px 4px;
    background:var(--color-surface-2);
    border:1px solid var(--color-edge);
    border-radius:var(--radius-pill);
    font-size:12px; font-weight:700; color:var(--color-text-3);
    cursor:pointer; transition:all 150ms; text-align:center;
  }
  .rpill.active {
    background:var(--color-accent-tint);
    border-color:var(--color-accent-ring);
    color:var(--color-accent);
  }

  /* ── Summary grid ─────────────────────────────────────────────── */
  .sum-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .sc { display:flex; flex-direction:column; align-items:center; gap:5px; padding:14px 10px; text-align:center; }
  .sc-val { font-size:22px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
  .sc-den { font-size:13px; font-weight:600; color:var(--color-text-3); }
  .sc-key { font-size:9px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-3); }

  /* ── Chart card wrapper ───────────────────────────────────────── */
  .cc { padding:16px; }
  .cc-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .cc-sub { font-size:10px; color:var(--color-text-4); }

  /* ── SVG text classes (must be :global — inside inline SVG) ─────── */
  :global(.svgt)   { font-family:'Inter Variable',sans-serif; }
  :global(.goal-t) { font:700 8px 'Inter Variable',sans-serif; fill:var(--color-ci); }
  :global(.bv-t)   { font:700 8px 'Inter Variable',sans-serif; fill:var(--color-text-3); }
  :global(.bl-t)   { font:600 7px 'Inter Variable',sans-serif; fill:var(--color-text-4); }
  :global(.dp-t)   { font:800 20px 'Inter Variable',sans-serif; fill:var(--color-text-1); font-variant-numeric:tabular-nums; }
  :global(.ds-t)   { font:600 10px 'Inter Variable',sans-serif; fill:var(--color-text-3); letter-spacing:0.03em; }

  /* ── Weekly bar chart ─────────────────────────────────────────── */
  .wk-svg { width:100%; display:block; overflow:visible; }
  .wk-bar { transition:opacity 150ms; }
  .wk-bar:hover { opacity:0.75; cursor:default; }

  /* ── Donut ────────────────────────────────────────────────────── */
  .mb-row { display:flex; align-items:center; gap:14px; }
  .donut-svg { width:130px; height:130px; flex-shrink:0; }
  .d-legend { flex:1; display:flex; flex-direction:column; gap:9px; min-width:0; }
  .dl-row { display:flex; align-items:center; gap:7px; }
  .dl-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .dl-lbl { font-size:11px; font-weight:600; color:var(--color-text-2); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .dl-val { font-size:11px; font-weight:700; color:var(--color-text-1); font-variant-numeric:tabular-nums; flex-shrink:0; }

  /* ── Method bars ──────────────────────────────────────────────── */
  .mt-bars { display:flex; flex-direction:column; gap:10px; }
  .mt-row { display:flex; align-items:center; gap:8px; }
  .mt-lbl { font-size:11px; font-weight:600; color:var(--color-text-2); width:68px; flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .mt-track { flex:1; height:8px; background:var(--color-surface-3); border-radius:var(--radius-pill); overflow:hidden; }
  .mt-fill { height:100%; border-radius:var(--radius-pill); transition:width 600ms cubic-bezier(.34,1.56,.64,1); }
  .mt-val { font-size:11px; font-weight:700; color:var(--color-text-2); font-variant-numeric:tabular-nums; width:34px; text-align:right; flex-shrink:0; }

  /* ── Heatmap ──────────────────────────────────────────────────── */
  .hm-scroll { overflow-x:auto; padding-bottom:6px; scrollbar-width:thin; scrollbar-color:var(--color-edge) transparent; }
  .hm-inner { display:inline-flex; flex-direction:column; gap:3px; }

  /* Month labels sit above the week columns; left-pad to align with columns (past the DOW labels) */
  .hm-months { display:flex; gap:3px; padding-left:17px; }
  .hm-mcell { width:18px; height:13px; position:relative; flex-shrink:0; }
  .hm-mlbl { font-size:9px; font-weight:700; color:var(--color-text-3); white-space:nowrap; position:absolute; left:0; }

  .hm-grid { display:flex; gap:3px; }
  .hm-dow { display:flex; flex-direction:column; gap:3px; width:14px; flex-shrink:0; }
  .hm-dl { height:18px; font-size:8px; font-weight:600; color:var(--color-text-4); display:flex; align-items:center; justify-content:center; }
  .hm-col { display:flex; flex-direction:column; gap:3px; }

  /* Heat cells */
  .hc { width:18px; height:18px; border-radius:3px; flex-shrink:0; }
  .te { background:transparent; }
  .t0 { background:var(--color-surface-3); }
  .t1 { background:oklch(72% 0.22 292 / 0.28); }
  .t2 { background:oklch(72% 0.22 292 / 0.58); }
  .t3 { background:var(--color-accent); box-shadow:0 0 6px oklch(72% 0.22 292 / 0.5); }
  .tr { background:oklch(75% 0.19 55 / 0.45); }

  .hm-leg { display:flex; align-items:center; gap:4px; padding-left:17px; margin-top:4px; }
  .hm-ll { font-size:9px; color:var(--color-text-4); font-weight:600; }
  .hm-leg .hc { cursor:default; }

  /* ── Smart insight ────────────────────────────────────────────── */
  .ins-card { display:flex; align-items:flex-start; gap:12px; padding:16px; border-radius:var(--radius-lg); }
  .ins-icon { font-size:20px; flex-shrink:0; line-height:1.4; }
  .ins-txt { font-size:13px; line-height:1.65; color:var(--color-text-2); }
</style>
