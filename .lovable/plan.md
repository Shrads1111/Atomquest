# GoalSync Build Plan

A frontend-only, cinematic dark enterprise app matching your v4.2.0 spec. No backend wiring — mock data only, so we can focus on the visual + interaction fidelity you specified.

## Design system (src/styles.css)
- Replace tokens with your obsidian palette (`--bg-obsidian-deep`, `--bg-surface-base`, `--bg-surface-elevated`, glass borders, glows, semantic accents: indigo, royal-blue, emerald, amber, crimson).
- Fonts: Inter Variable (display/body) + JetBrains Mono (metrics) via Google Fonts.
- Utilities: `.glass-card`, `.cinematic-shimmer`, glow shadows, mesh-gradient background, radial focus glow on inputs.
- Keyframes: shimmer sweep, ambient mesh drift, pulse-glow, sparkline draw.

## Routes (TanStack file-based)
```
src/routes/
  __root.tsx              -> shell + global mesh background
  index.tsx               -> redirects to /login (or login lives here)
  login.tsx               -> Page 1: split-screen auth
  _app.tsx                -> authed layout: top nav + persona switcher
  _app/employee.tsx       -> Page 2: employee workspace
  _app/goals.new.tsx      -> Page 3: 3-step goal wizard
  _app/manager.tsx        -> Page 4: manager governance
  _app/admin.tsx          -> Page 5: admin control center
  _app/checkin.tsx        -> Page 6: quarterly check-in
  _app/intelligence.tsx   -> Page 7: executive analytics
```
A persona switcher in the top nav lets the demo jump between Employee/Manager/Admin views without real auth.

## Components (src/components/goalsync/)
- `MeshBackground`, `GlassCard`, `MetricTile`, `ProgressBar`, `WeightRing`, `Sparkline`, `RadarChart`, `TrendChart` (SVG, no chart lib), `StatusChip`, `CycleTimeline`, `AuditRow`, `GoalRow`, `WizardStepper`, `UoMRadioCards`, `WeightSlider`, `ValidationPanel`, `PersonaSwitcher`, `TopNav`.
- All SVG-based viz (no recharts) for tight visual control matching the spec.

## Validation logic
- `src/lib/goal-validation.ts` implements your `verifyGoalSheetCompositionIntegrity` rules (≤8 goals, ≥10% each, sum = 100%) and powers the live integrity panel on Page 3.

## Scope notes
- Static mock data in `src/lib/mock-data.ts` — no Cloud/Supabase, no real auth, no Entra ID integration (the SSO button is visual-only).
- SEO `head()` metadata on each route.
- Sitemap + robots.txt added at the end.

## Out of scope (call out if you want them)
- Real authentication / Entra ID
- Database persistence
- Real-time websockets
- CSV/XLSX export wiring (buttons will be visual)

Reply "go" and I'll build it end-to-end. If you'd rather I narrow to a subset of pages first (e.g. Employee + Wizard + Manager), say which.
