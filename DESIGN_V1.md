# Design V1 — Nzyme Brand System

## Context

This is a visual-only design pass. Do not modify any data logic, Supabase queries, hooks,
component structure, or routing. Only change visual presentation: colours, typography,
spacing, borders, shadows, and Tailwind utility classes.

All changes go on the `design-v1` branch. Do not touch `main`.

---

## Brand Reference

**Source:** https://www.kiboventures.com/projects/kibo-nzyme

**Brand character:** Sophisticated, minimal, purposeful. Serious but not cold.
"Ambition & Trust" — a PE fund that values precision and partnership.

**Logo to use in sidebar:**
```
https://cdn.prod.website-files.com/692d860604fb0f6ef09715d6/694550bca813015063bf7d53_nzyme.png
```
Replace the current "PE / Kibo Ventures" text lockup in the sidebar with this logo image.
Set width to 120px, maintain aspect ratio. Add `alt="Nzyme"`.

---

## 1. Design Tokens — Replace `src/index.css`

Replace all CSS custom properties in `src/index.css` with these values.
Keep all existing Tailwind directives (`@tailwind base/components/utilities`).
Only replace the `:root {}` block.

```css
:root {
  /* ── Core palette ─────────────────────────────────────── */
  --ink:          #0f0f0f;        /* near-black — primary text */
  --paper:        #f7f5f0;        /* warm off-white — page background */
  --white:        #ffffff;        /* pure white — card backgrounds */
  --muted:        #6b7280;        /* medium grey — secondary text */
  --rule:         #e5e7eb;        /* light grey — borders and dividers */
  --subtle:       #f3f4f6;        /* very light grey — table zebra, hover */

  /* ── Nzyme brand accent ───────────────────────────────── */
  --accent:       #0f2a1e;        /* deep forest green — primary brand colour */
  --accent-mid:   #1a4a30;        /* mid green — hover states */
  --accent-light: #e8f0eb;        /* pale green — backgrounds, badges */
  --accent-text:  #ffffff;        /* white — text on accent backgrounds */

  /* ── Semantic colours ─────────────────────────────────── */
  --danger:       #dc2626;        /* red — over budget, alerts */
  --warning:      #d97706;        /* amber — medium quality, caution */
  --success:      #16a34a;        /* green — positive metrics */
  --info:         #2563eb;        /* blue — neutral info */

  /* ── Deal stage colours ───────────────────────────────── */
  --stage-dd:         #0f2a1e;    /* DD Phase — brand dark green */
  --stage-working:    #1d4ed8;    /* Working on Deal — blue */
  --stage-analysis:   #92400e;    /* Under Analysis — amber brown */
  --stage-explored:   #4b5563;    /* Being Explored — grey */
  --stage-portfolio:  #5b21b6;    /* Portfolio — purple */
  --stage-processed:  #9ca3af;    /* To be processed — light grey */

  /* ── Adviser tier colours ─────────────────────────────── */
  --tier-gold:    #92400e;        /* Gold — warm brown */
  --tier-gold-bg: #fef3c7;
  --tier-silver:  #374151;        /* Silver — dark grey */
  --tier-silver-bg: #f3f4f6;
  --tier-bronze:  #78350f;        /* Bronze — deep amber */
  --tier-bronze-bg: #ffedd5;

  /* ── Typography ───────────────────────────────────────── */
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'DM Mono', 'Courier New', monospace;

  /* ── Spacing & radius ─────────────────────────────────── */
  --radius-sm:    4px;
  --radius-md:    8px;
  --radius-lg:    12px;
  --shadow-card:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 12px rgba(0,0,0,0.08);
}
```

---

## 2. Sidebar — `src/components/layout/Sidebar.jsx`

**Target appearance:** Dark sidebar matching the Nzyme brand. Clean, minimal, confident.

### Sidebar container
```
bg-[#0f2a1e] text-white
w-56 min-h-screen flex flex-col
border-r border-[#1a4a30]
```

### Logo area (top of sidebar)
Replace the current "PE / Kibo Ventures" text with the Nzyme logo:
```jsx
<div className="px-6 py-6 border-b border-[#1a4a30]">
  <img
    src="https://cdn.prod.website-files.com/692d860604fb0f6ef09715d6/694550bca813015063bf7d53_nzyme.png"
    alt="Nzyme"
    className="w-28 brightness-0 invert"
  />
</div>
```
Note: `brightness-0 invert` turns the logo white so it's visible on the dark background.

### Section labels (TEAM, REPORTING)
```
px-6 pt-6 pb-2
text-[10px] font-semibold tracking-widest uppercase
text-[#4a7a5a]
```

### Nav items — default state
```
flex items-center gap-3 px-6 py-2.5
text-[13px] font-medium text-[#a8c4b0]
rounded-none
transition-colors duration-150
hover:text-white hover:bg-[#1a4a30]
```

### Nav items — active state
```
text-white bg-[#1a4a30]
border-l-2 border-white
```

### Remove all emoji icons from nav items.
Replace with simple filled square indicators or remove icons entirely for a cleaner look.
The text labels alone are sufficient.

---

## 3. Filter Bar — `src/components/layout/FilterBar.jsx`

**Target:** Clean white bar, flush with top, clear separation from page content.

### Container
```
bg-white border-b border-[--rule]
px-8 py-3
flex items-center gap-4
sticky top-0 z-10
shadow-sm
```

### Date pills (LTM / YTD / All / Custom)
- Default: `bg-[--subtle] text-[--muted] text-xs font-medium px-3 py-1.5 rounded-full border border-[--rule]`
- Active: `bg-[--accent] text-white text-xs font-medium px-3 py-1.5 rounded-full`
- Hover: `hover:border-[--accent] hover:text-[--accent]`

### Filter dropdowns (KAM, Stage, Channel)
```
text-xs font-medium text-[--ink]
border border-[--rule] rounded-md
px-3 py-1.5
bg-white
hover:border-[--accent]
focus:ring-1 focus:ring-[--accent] focus:border-[--accent]
```

### Data freshness indicator
```
ml-auto text-xs text-[--muted] font-mono
```

---

## 4. KPI Cards — `src/components/ui/KpiCard.jsx`

**Target:** Clean white cards with subtle shadow. No coloured borders.
Numbers large and prominent using monospace font.

```jsx
// Card wrapper
<div className="bg-white rounded-lg border border-[--rule] p-6 shadow-[--shadow-card]">
  {/* Label */}
  <p className="text-xs font-semibold tracking-widest uppercase text-[--muted] mb-3">
    {label}
  </p>
  {/* Value */}
  <p className="font-['DM_Mono'] text-3xl font-medium text-[--ink] leading-none mb-1">
    {value}
  </p>
  {/* Sublabel */}
  <p className="text-xs text-[--muted] mt-2">
    {sublabel}
  </p>
</div>
```

KPI card grid: `grid grid-cols-4 gap-4 mb-8`

---

## 5. Page Layout & Typography

### Page title
```
font-['DM_Serif_Display'] text-3xl text-[--ink] tracking-tight mb-1
```

### Page subtitle / description
```
text-sm text-[--muted] mb-6
```

### Section card (wraps each chart or table)
```
bg-white rounded-lg border border-[--rule] shadow-[--shadow-card] p-6 mb-6
```

### Card title
```
font-semibold text-base text-[--ink] mb-1
```

### Card description
```
text-xs text-[--muted] mb-5
```

### Page background
```
bg-[--paper] min-h-screen
```

### Main content area padding
```
px-8 py-8
```

---

## 6. Tables

### Table wrapper
```
overflow-x-auto rounded-lg border border-[--rule]
```

### Table element
```
w-full text-sm border-collapse
```

### Header row
```
bg-[--subtle] text-[10px] font-semibold tracking-widest uppercase text-[--muted]
border-b border-[--rule]
```

### Header cell
```
px-4 py-3 text-left
```

### Body row — default
```
border-b border-[--rule] hover:bg-[--subtle] transition-colors
```

### Body row — expanded/active
```
bg-[--accent-light]
```

### Body cell
```
px-4 py-3 text-sm text-[--ink]
```

### Total/summary row
```
bg-[--subtle] font-semibold border-t-2 border-[--rule]
```

---

## 7. Badges

### Tier badges
```jsx
// Gold
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[--tier-gold-bg] text-[--tier-gold]">
  Gold
</span>

// Silver
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[--tier-silver-bg] text-[--tier-silver]">
  Silver
</span>

// Bronze
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[--tier-bronze-bg] text-[--tier-bronze]">
  Bronze
</span>
```

### Stage badges
Use a dot indicator rather than a pill badge — cleaner at table scale:
```jsx
<span className="flex items-center gap-1.5 text-xs">
  <span className="w-2 h-2 rounded-full bg-[--stage-dd] flex-shrink-0" />
  DD Phase
</span>
```

### Quality/Priority badges
- High: `bg-green-50 text-green-700`
- Medium-high: `bg-emerald-50 text-emerald-700`
- Medium: `bg-amber-50 text-amber-700`
- Low: `bg-red-50 text-red-700`

---

## 8. Chart Styling

Apply these colours consistently across all Recharts components.

### Primary chart palette (in order)
```js
export const CHART_COLORS = {
  primary:    '#0f2a1e',   // accent dark green — dealflow, primary series
  secondary:  '#2d6a4a',   // mid green — secondary series
  tertiary:   '#74b49b',   // light green — tertiary series
  blue:       '#1d4ed8',   // blue — Working on Deal
  amber:      '#92400e',   // amber — Under Analysis / Origination
  purple:     '#5b21b6',   // purple — Portfolio
  grey:       '#9ca3af',   // grey — inactive / other
}
```

### Recharts global defaults to apply
- `CartesianGrid`: `strokeDasharray="3 3" stroke="#e5e7eb" vertical={false}`
- `XAxis` / `YAxis`: `tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'DM Mono' }}`
- `Tooltip`: `contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}`
- `Bar` radius: `radius={[3, 3, 0, 0]}` for vertical bars, `radius={[0, 3, 3, 0]}` for horizontal
- All chart containers: `ResponsiveContainer width="100%" height={280}`

---

## 9. Pivot Toggle Buttons

Replace current pill/button styling with this pattern:

```jsx
// Container
<div className="inline-flex bg-[--subtle] rounded-md p-0.5 gap-0.5">
  {/* Active */}
  <button className="px-3 py-1.5 text-xs font-medium rounded bg-white text-[--ink] shadow-sm">
    By Volume
  </button>
  {/* Inactive */}
  <button className="px-3 py-1.5 text-xs font-medium rounded text-[--muted] hover:text-[--ink]">
    By Quality
  </button>
</div>
```

---

## 10. Specific Page Fixes

### All pages
- Page title uses `font-['DM_Serif_Display']`
- Remove any remaining `Sign In` button (Supabase auth UI leak)
- Consistent `px-8 py-8` content padding

### Board Pipeline
- Financial columns (REV, EBITDA): set `min-w-[80px] text-right` on each cell
- Truncate description at 60 chars with `truncate max-w-[200px]`
- Stage group header rows: `bg-[--accent-light] text-[--accent] font-semibold text-xs tracking-widest uppercase`

### Adviser Coverage
- "No Adviser Data" row: italic grey text `text-[--muted] italic`
- KAM column: show only first name + last initial using `shortName()` helper

### Funnel Analysis
- Stage dots in the funnel table: use stage colour variables from section 7
- Conversion % column: green if >50%, amber if 20–50%, red if <20%

---

## 11. What NOT to Change

- Do not modify any `.jsx` component structure beyond className changes
- Do not modify any hooks (`useFilters`, `useDeals`, etc.)
- Do not modify any Supabase queries
- Do not modify `vercel.json`, `vite.config.js`, `middleware.js`
- Do not change routing or navigation logic
- Do not add new npm packages
- Do not change chart data props — only styling props (colours, stroke, fill)

---

## 12. Testing Checklist

Before committing, verify:
- [ ] Sidebar is dark green with white Nzyme logo visible
- [ ] All 6 reporting pages load without errors
- [ ] Time Tracker form still submits correctly
- [ ] Filter bar appears on reporting pages, not on Time Tracker
- [ ] KPI cards display correctly on all pages
- [ ] Tables scroll horizontally internally — page width never changes
- [ ] Charts render with updated colour palette
- [ ] No `Sign In` button visible anywhere
- [ ] `npm run build` completes with no errors
