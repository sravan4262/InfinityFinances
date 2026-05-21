# Mobile App Implementation Guide - Web Parity Plan

This guide defines the plan for making the iOS app a native, optimized copy of the web app while keeping the current mobile design direction intact. The web app is the source of truth for product behavior, calculator logic, API wiring, saved data behavior, visual hierarchy, colors, tabs, charts, and empty/loading/error states.

The goal is not a literal web port. The goal is feature parity with native iOS ergonomics: compact inputs, safe-area-aware screens, smooth tabs, scrollable segments, bottom sheets, native haptics, and mobile-friendly chart layouts.

## Source Of Truth

Use these web files as the parity baseline:

- `ui/app/page.tsx` - main app routing, saved-plan launch behavior, active areas
- `ui/app/globals.css` - light/dark color tokens, chart colors, card/input/border treatment
- `ui/components/features/calculator/*` - retirement simple and advanced inputs
- `ui/components/features/calculator/results/*` - retirement result sections, charts, variants, what-if, Monte Carlo, tables
- `ui/components/features/plans/*` - saved retirement plan landing, save/update/delete flows
- `ui/components/features/home-calc/*` - break-even, mortgage, affordability, buying guide, profile behavior
- `ui/components/features/money/*` - budget tabs, transaction flows, summary/stats/budget/notes views
- `ui/components/features/tracker/*` - monthly savings log and trending dashboard
- `ui/lib/api/*` - API contracts
- `ui/lib/engine/*` - FIRE engine
- `ui/lib/money/*` - budget domain logic
- `ui/lib/tracker/*` - tracker domain logic

Use these mobile files as the implementation surface:

- `mobile/src/theme/colors.ts`
- `mobile/src/components/ui/*`
- `mobile/src/features/calculator/*`
- `mobile/src/features/results/*`
- `mobile/src/features/home-calc/*`
- `mobile/src/features/money/*`
- `mobile/src/features/tracker/*`
- `mobile/src/lib/api/*`
- `mobile/src/lib/store.ts`
- `mobile/src/lib/money/*`
- `mobile/src/lib/tracker/*`
- `mobile/app/(tabs)/*`

## Current Gap Summary

The iOS app already has working versions of the major product areas, but several screens are simplified compared with web.

- Retirement has Calculator, Advanced, and Results tabs, but Results needs richer web parity: spouse/combined switching, full chart states, what-if depth, Monte Carlo bands, historical scenarios, account sequencing, share/save polish, and more complete result sections.
- Retirement saved plans are already shown first when the user has saved plans, matching web behavior. The list needs stronger visual and interaction parity with the web `PlansLanding`.
- Home has Break-even, Mortgage, Affordability, and Guide tabs, but profile controls, save/update behavior, result cards, and calculator details need to match web more closely.
- Budget has Daily, Calendar, Monthly, Summary, Stats, Budget, and Notes tabs, but the tab content and add/edit transaction sheet are simplified.
- Tracker has Monthly Log and Trending, but the trending dashboard is lighter than web.
- Mobile colors approximate the web palette, but chart colors and OKLCH-derived tokens need a deliberate parity pass.

## Implementation Status

- Phase 1 - Design Token And Component Parity: Completed initial pass on mobile theme tokens, shared input/button/card/sheet/segment primitives, scrollable segmented controls, and reusable SVG chart primitives.
- Phase 2 - Retirement Parity: Implemented mobile results parity pass with saved-plan launch behavior, spouse/combined switching, richer stat sections, FIRE variants, what-if overlay, Monte Carlo bands, historical sequence results, account sequencing, save/update, share, certainty, and edit actions.
- Phase 3 - Home Calculator Parity: Implemented profile load/save/update behavior, first-profile launch, profile picker, full break-even/mortgage/affordability input coverage, native result cards, and mobile chart equivalents.
- Phase 4 - Budget / Money Parity: Implemented seven mobile tabs, richer add/edit transaction sheet, category/account/date/description/note/recurrence fields, budget progress, stats visuals, notes grouping, and logged-in sync lifecycle.
- Phase 5 - Tracker Parity: Implemented month navigation, planned/actual logging, category add/remove, trend charts, month rows, summary cards, variance styling, and tracker API sync lifecycle.
- Phase 6 - API, Auth, And Chat Context: Implemented/verified Expo API URL usage, Supabase bearer-token attachment, shared API error modal, logged-out local budget/tracker/home behavior, and chat context publication for Retirement, Home, and Budget.
- Phase 7 - Navigation And iOS Optimization: Implemented safe-area-aware screens/sheets, scrollable long tab sets, touch-friendly result/action controls, compact chart legends, and native chart layouts.
- Phase 8 - Verification: Passed `npx tsc --noEmit -p mobile/tsconfig.json` and `npm run test:parity --workspace=mobile` for this implementation pass.

Re-audit update:

- Closed remaining checklist gaps in Advanced FIRE input coverage: EMIs/debts, future expenses, future investments/purchases, children/dependents, accumulation tax, retirement tax, healthcare inflation, Medicare age, pension start age, Roth conversion ladder, and monthly retirement salary.
- Added the Simple calculator advanced-active notice for hidden assumptions that still affect the preview.
- Aligned mobile Budget default accounts/categories/colors and first-login sync behavior more closely with web.
- Added Budget Calendar day drill-down into Daily.
- Re-ran `npx tsc --noEmit -p mobile/tsconfig.json` and `npm run test:parity --workspace=mobile`; both passed after the re-audit fixes.

## Implementation Principles

- Keep the current iOS visual style, launcher, and native app structure.
- Preserve web behavior unless there is a clear mobile reason to adapt presentation.
- Reuse shared TypeScript logic and API contracts wherever possible.
- Do not fork calculator math between platforms.
- All tabs visible on web should exist on iOS.
- All saved-data launch behavior on web should exist on iOS.
- All charts on web should have an iOS equivalent, even if the chart is reformatted for smaller screens.
- Every input that affects a web result must exist on iOS.
- Every API-backed feature needs loading, empty, error, retry, logged-out, and logged-in states.

## Phase 1 - Design Token And Component Parity

Audit web tokens in `ui/app/globals.css` and align mobile theme tokens in `mobile/src/theme/colors.ts`.

Required token groups:

- Background, foreground, card, elevated card
- Muted background and muted text
- Border and input backgrounds
- Primary, primary pressed, primary foreground
- Gold
- Success
- Warning
- Destructive
- Chart colors 1 through 5
- Primary/gold/success wash colors
- Glow colors used by launcher and hero cards

Component work:

- Normalize `Screen`, `Card`, `SectionCard`, `StatCard`, `SegmentedControl`, `NumberField`, `TextField`, `SliderField`, `BottomSheet`, `AppButton`, and `IconButton`.
- Ensure inputs support label, hint, prefix, suffix, error, currency, percent, min/max, disabled, and loading states.
- Make segmented controls horizontally scrollable where needed, especially Budget's seven tabs.
- Add consistent card radius, border, shadow/elevation, and spacing.
- Ensure dark/light themes match web mood and contrast.
- Add reusable mobile chart primitives using `react-native-svg`:
  - sparkline
  - area chart
  - multi-line chart
  - percentile band chart
  - progress bar
  - category breakdown chart

Acceptance checks:

- iOS dark and light screens visually match web token intent.
- No tab label wraps awkwardly or overflows.
- Inputs and cards remain stable across small and large iPhones.
- Chart colors are consistent across Retirement, Budget, Tracker, and Home.

## Phase 2 - Retirement Parity

Retirement is the highest-priority parity area.

### Launch Behavior

Match web launch behavior:

- If logged in and saved retirement plans exist, the Retirement entry opens the saved plans landing first.
- If no plans exist, open Simple Calculator.
- Tapping a saved plan loads inputs, calculates results, and opens Results.
- Editing a saved plan loads inputs and opens the editor.
- Creating a new plan resets to a clean calculator state.

### Simple Calculator

Match web fields and behavior:

- Currency selector
- Current age
- Target retirement age
- Total saved today
- Monthly savings
- Monthly spend in retirement
- Expected annual return slider
- FIRE number preview
- Hidden defaults:
  - life expectancy
  - withdrawal rate
  - inflation rate
  - expected return
- Advanced-active notice when hidden advanced inputs affect the simple preview
- Link to Advanced for taxes, pension, spouse/partner, children, EMIs, and other assumptions

All fields must map to the same engine inputs as web.

### Advanced Wizard

Bring iOS Advanced to full web parity while keeping the native wizard:

- You
- Income
- Portfolio
- Advanced
- Goals / Scenarios

Required input coverage:

- Current age, retirement age, life expectancy
- Spouse/partner toggle and spouse inputs
- Gross income, after-tax income, annual spending
- Salary growth
- Savings streams
- Assets, asset presets, account types, balances, returns, monthly contributions
- Inflation
- EMIs / debts if present in web advanced inputs
- Future expenses
- Future investments / future purchases
- Children / dependent assumptions
- Social Security / NPS
- Pension
- Healthcare premiums
- Accumulation tax rate
- Retirement tax rate
- Roth conversion ladder
- Retirement spending
- Monthly retirement salary
- Withdrawal rate

### Results

Mobile Results must mirror web `ResultsDashboard` sections:

- Result view switcher: You, Spouse, Combined
- Action buttons:
  - Certainty check
  - Share
  - Save / update plan
  - Edit inputs
- FIRE number hero
- PV corpus label
- Monte Carlo success badge
- Hero stat cards:
  - FIRE number
  - Retire at
  - Years to FIRE
  - Savings rate
  - PV corpus needed
  - Money lasts until
- Nominal retirement salary callout
- FIRE variants:
  - Lean
  - Standard
  - Fat
- Portfolio growth chart:
  - Base projection
  - FIRE target reference line
  - Retirement age marker
  - What-if overlay
  - Monte Carlo p10-p90 and p25-p75 bands
- Yearly projection table
- Sensitivity table
- What-if panel
- Account sequencing panel
- Monte Carlo panel
- Historical sequence results
- Certainty check state
- Save/update plan panel
- Shortfall/cushion callout
- Edit inputs button

Acceptance checks:

- Same inputs produce same FIRE numbers on web and iOS.
- Saved plan load/edit/delete/create behavior matches web.
- Portfolio graph renders nonblank and captures target line, retirement marker, what-if line, and Monte Carlo bands when enabled.
- Results are useful on small iPhones without horizontal overflow.

## Phase 3 - Home Calculator Parity

Home iOS must match web tabs:

- Break-even
- Mortgage
- Affordability
- Buying Guide

### Profile Behavior

Match web `HomeCalcPage` behavior:

- Detect logged-in user.
- Load saved home profiles.
- If profiles exist, load the first profile by default.
- Profile picker.
- Create new profile.
- Save current active profile.
- Update active profile.
- Persist break-even, mortgage, and affordability inputs together.

### Break-even

Match web inputs and outputs:

- Purchase price
- Down payment
- Monthly rent saved
- Annual appreciation
- Interest rate
- Loan term
- Property tax / insurance / HOA / maintenance if represented on web
- Closing/selling assumptions if represented on web
- Break-even result card
- Monthly payment result card
- Any web summary, timeline, or chart outputs

### Mortgage

Match web mortgage calculator:

- Home price
- Down payment
- Interest rate
- Loan term
- Extra monthly payment
- Monthly payment
- Total interest
- Payoff timing if web shows it
- Amortization table/chart equivalent

### Affordability

Match web affordability calculator:

- Annual income
- Monthly debts
- Down payment
- Rate and loan assumptions
- Scenario cards
- DTI outputs
- Conservative/moderate/aggressive affordability ranges if present on web

### Buying Guide

Keep content and ordering aligned with web, formatted for native reading.

Acceptance checks:

- Home profile data round-trips through the same API as web.
- Each tab has the same input coverage as web.
- All result cards and charts use mobile theme tokens.

## Phase 4 - Budget / Money Parity

Budget iOS must match web tabs:

- Daily
- Calendar
- Monthly
- Summary
- Stats
- Budget
- Notes

### Shared Store And Sync

Align mobile money store with web:

- Same default accounts.
- Same default categories.
- Same category colors, converted from web palette where necessary.
- Same transaction shape.
- Same recurrence behavior.
- Same budget behavior.
- Same server sync lifecycle.
- Same logged-out local mode and logged-in server reconciliation.

### Daily

Match web:

- Add transaction
- Edit transaction
- Delete transaction
- Income/expense kind
- Amount
- Date
- Category
- Account
- Note/description
- Recurring entry support
- Recurring indicator
- Empty state

### Calendar

Match web:

- Month calendar grid
- Per-day income/expense/net display
- Current month navigation
- Select day to drill into Daily
- Empty days remain visually clean

### Monthly

Match web:

- Year month list
- Monthly income, expense, net
- Tap month to switch context

### Summary

Match web:

- Net summary
- Account summaries
- Category summaries where present
- Income/expense totals

### Stats

Match web:

- Category breakdowns
- Top spending categories
- Income/expense visuals
- Mobile chart equivalent for any web graph

### Budget

Match web:

- Category budget inputs
- Budget total
- Spent/remaining status
- Progress indicators
- Over-budget styling

### Notes

Match web:

- Group transactions by note
- Count and amount summary
- Empty state

Acceptance checks:

- All seven tabs exist and remain usable on iPhone width.
- Add/edit transaction sheet captures all web fields.
- Logged-in sync uses API data correctly.
- Stats and budget visuals are nonblank and color-consistent.

## Phase 5 - Tracker Parity

Tracker iOS must match web tabs:

- Monthly Log
- Trending

### Monthly Log

Match web:

- Planned savings
- Actual savings
- Category rows
- Add category
- Remove category
- Month context
- Planned vs actual totals
- Variance styling

### Trending

Match web:

- Trend chart
- Month-by-month rows
- Planned vs actual comparison where web shows it
- Summary cards
- Empty state

Acceptance checks:

- Tracker entries persist and sync according to existing tracker store/API behavior.
- Trend chart uses the same chart token family as other app graphs.

## Phase 6 - API, Auth, And Chat Context

Ensure iOS uses the same API contracts as web:

- `plansApi`
- `homeCalcApi`
- `moneyApi`
- `trackerApi`
- `featuresApi`
- `chatApi`

Required behavior:

- Mobile API client reads Expo API URL.
- Supabase access token is attached to authenticated requests.
- Network errors show the shared API error modal.
- Authenticated-only features show sign-in prompts where appropriate.
- Retirement, Home, and Budget publish chat context equivalent to web.
- API failures never silently lose user input.

Acceptance checks:

- Logged out flows remain usable where web allows local usage.
- Logged in flows sync with existing web-created data.
- Web-created plans and home profiles appear on iOS.
- iOS-created plans and profiles appear on web.

## Phase 7 - Navigation And iOS Optimization

Preserve the current native app structure:

- Launcher card stack remains the app entry.
- Main tools:
  - Retire
  - Home
  - Budget
  - Tracker
- Retirement keeps Calculator, Advanced, Results tabs.

iOS optimization requirements:

- Respect safe areas.
- Use native scroll views, keyboard avoidance, and bottom sheets.
- Use haptics for selection, save, destructive actions, and calculation moments.
- Avoid tiny tap targets.
- Avoid horizontal overflow.
- Keep long tab sets scrollable.
- Keep chart legends compact.
- Use native headers only where they help.
- Keep large result screens skimmable with section cards and collapsible advanced sections where needed.

## Phase 8 - Verification

Run these checks before considering the parity pass complete:

```bash
npx tsc --noEmit -p mobile/tsconfig.json
npm run test:parity --workspace=mobile
```

Manual simulator/device checks:

- iOS dark theme
- iOS light theme
- logged out
- logged in with no saved retirement plans
- logged in with saved retirement plans
- logged in with saved home profiles
- budget sync with existing transactions/categories/budgets
- tracker entries across multiple months

Screenshot parity checklist:

- Launcher
- Retirement saved plans landing
- Retirement simple calculator
- Retirement advanced wizard, every step
- Retirement results with base chart
- Retirement results with what-if enabled
- Retirement results with certainty/Monte Carlo enabled
- Home Break-even
- Home Mortgage
- Home Affordability
- Home Buying Guide
- Budget Daily
- Budget Calendar
- Budget Monthly
- Budget Summary
- Budget Stats
- Budget Budget
- Budget Notes
- Tracker Monthly Log
- Tracker Trending

Chart validation:

- No blank SVG/canvas areas.
- Axis and labels fit on iPhone widths.
- FIRE target and retirement markers are visible.
- Monte Carlo bands render when certainty is enabled.
- Budget stats and tracker trend charts use correct category/chart colors.

## Recommended Build Order

1. Design tokens and shared mobile UI components.
2. Mobile chart primitives.
3. Retirement saved-plan landing and Simple calculator parity.
4. Retirement Advanced wizard input coverage.
5. Retirement Results full parity.
6. Home calculator profile and tab parity.
7. Budget store alignment and seven-tab parity.
8. Tracker parity.
9. API/auth/error/loading polish.
10. Simulator screenshots and final parity QA.

## Definition Of Done

The mobile app can be considered web-parity complete when:

- Every web tab exists on iOS.
- Every web input that affects calculations exists on iOS.
- Saved retirement plans launch first on iOS when available.
- Saved home profiles load and save on iOS like web.
- Budget Daily, Calendar, Monthly, Summary, Stats, Budget, and Notes are all functional.
- Charts exist for every meaningful web graph and use the same color language.
- API wiring is shared or contract-identical with web.
- Web-created data appears correctly on iOS.
- iOS-created data appears correctly on web.
- The app remains native-feeling, touch-friendly, and visually aligned with the current iOS design.
