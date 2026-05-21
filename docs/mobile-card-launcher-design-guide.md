# Mobile App Card Launcher Design Guide

## Objective

Update the mobile app so its entry experience feels more distinctive and better aligned with the existing web product, while preserving the current feature screens and workflows.

## Scope Guardrail

This work is **mobile-only**.

- Modify the mobile app implementation under `mobile/`
- Do **not** change the web app implementation under `ui/`
- The web app should be used only as the visual reference for color matching and product parity
- If palette values or design decisions need to be mirrored, copy/adapt them into the mobile theme rather than editing the web app

The mobile app should launch into a **centered, vertically stacked, infinitely scrollable card launcher** instead of immediately opening a feature tab. Each card represents one of the current top-level product areas:

1. **Early Retirement**
2. **Home Mortgage**
3. **Expense**

The cards act as a visual home screen. Tapping a card should take the user into the **current existing mobile screen** for that feature.

---

## Core Navigation Model

### On app launch

Show a card launcher screen with three overlapping cards centered vertically on the device:

- Early Retirement
- Home Mortgage
- Expense

The stack should:

- be vertically arranged
- visibly overlap
- remain centered on screen
- support infinite scrolling in both directions
- always keep one active/front card in focus
- allow the user to scroll forward or backward forever through the three cards

### On card tap

Tapping the active card should route to the existing corresponding screen:

| Launcher Card | Destination |
| --- | --- |
| Early Retirement | Current retirement calculator screen |
| Home Mortgage | Current home calculator screen |
| Expense | Current budget / expense screen |

Do **not** redesign or replace those existing feature screens as part of the launcher work. The launcher is a new entry layer above the current screens.

### Returning to the launcher

Each destination screen should provide a clear way to return to the launcher card screen. This can be:

- a back button in the header, or
- a dedicated launcher/home affordance

The return path should be obvious and consistent across all three sections.

---

## Visual Direction

The mobile app should be visually aligned with the existing `ui/` web app folder.

This is not limited to the launcher screen. The **entire mobile app** should be updated so its colors coordinate with the web app, including:

- launcher screen
- retirement flow
- home calculator flow
- expense / budget flow
- tracker flow if retained
- shared components such as buttons, cards, fields, segmented controls, tabs, headers, and empty states

### Required color alignment

Use the same color language as the web app:

- deep indigo-black background
- violet primary accent
- muted slate card surfaces
- soft border treatment
- restrained gold accent where appropriate

The mobile app should not drift into a separate palette. It should feel like the same product family as the web app.

### Reference palette from the web app

Source of truth:

`ui/app/globals.css`

This file is a **read-only reference for the mobile redesign**. It should not be modified as part of this work.

Key dark-theme values currently used on web:

- background: deep indigo-black
- foreground: soft near-white
- card: dark slate-indigo
- primary: violet
- muted: low-contrast slate
- border: subtle indigo-gray
- gold: warm gold accent

The mobile theme should be updated to match these web colors as closely as practical.

The goal is that a user moving between web and mobile feels they are inside the same product system, with the same palette, contrast logic, and accent behavior.

---

## Card Launcher Design Requirements

### Layout

- Full-screen launcher view
- Stack centered vertically
- Three large portrait cards
- Cards overlap enough that the stack is obvious before interaction
- One front card is fully readable
- One card peeks above and one below
- Minimal introductory copy above the stack

### Interaction

- Vertical wheel / drag / swipe scroll changes the active card
- Infinite looping:
  - scrolling down after the third card returns to the first
  - scrolling up before the first card returns to the third
- Only the active/front card should be tappable
- Motion should feel smooth, calm, and premium rather than playful or bouncy

### Card styling

Each card should:

- use the mobile/web-matched card color
- have subtle borders
- include a soft glow treatment
- feel elevated from the background
- have enough differentiation to make the stack legible

### Glow treatment

Cards should glow subtly using the web palette, especially the active card.

Recommended behavior:

- active card: strongest soft violet glow
- inactive cards: much weaker ambient glow
- optional use of gold or success accents only within content, not as dominant card fills

The glow should feel refined, not neon.

---

## Suggested Card Content

### Early Retirement

- Label: `Financial Independence`
- Title: `Early Retirement`
- Supporting text: `When can you stop working?`
- Metric / hook: `Six numbers, one answer`

### Home Mortgage

- Label: `Housing`
- Title: `Home Mortgage`
- Supporting text: `Break-even, mortgage, and affordability calculators.`
- Metric / hook: a live affordability summary when available

### Expense

- Label: `Cash Flow`
- Title: `Expense`
- Supporting text: `Daily transactions, recurring costs, and monthly summaries.`
- Metric / hook: a current-month summary when available

---

## Relationship to Existing Screens

The launcher should **not** replace the feature UI.

After the user taps a card:

- they should arrive at the existing mobile screen for that feature
- the current calculator / input / result flows should remain intact
- the feature screens may later be refined visually, but that is separate from this launcher task

This preserves:

- the current information architecture
- the existing workflows
- parity with the current web app behavior

The launcher is the new front door, not a new house.

---

## Implementation Notes

Likely implementation shape in the mobile app:

1. Add a new launcher route / initial screen
2. Make that launcher the default route when the app opens
3. Keep existing routes for:
   - retirement
   - home
   - expense / budget
4. On card tap, navigate to the matching current route
5. Add a consistent return-to-launcher control from those screens
6. Update the mobile theme tokens to match the web app color system
7. Add glow/elevation tokens reusable across launcher cards and possibly future components
8. Audit the rest of the mobile app and replace any leftover mobile-only color drift so all major screens and shared components coordinate with the web palette

---

## Prototype Reference

A prototype of the intended launcher interaction was created at:

`docs/mockups/vertical-card-launcher.html`

That mockup demonstrates:

- centered overlapping cards
- infinite vertical scrolling behavior
- one active card at a time
- click-through from cards into placeholder feature screens
- return back to the launcher

Use it as the interaction reference, not as final production styling.

---

## Acceptance Criteria

- App launches into the stacked card launcher
- Three cards are visible as an overlapping centered stack
- User can scroll infinitely through the cards
- Active card has a refined glow treatment
- Tapping each active card routes to its current existing screen
- User can return from each screen to the launcher
- Mobile colors visually match the current web app palette
- Color coordination is applied across the whole mobile app, not only the launcher
- Existing retirement, home, and expense flows continue to work unchanged after entry
