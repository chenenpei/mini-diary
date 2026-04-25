---
name: MiniDiary
description: Local-first PWA journal with Swiss-international typography and warm stone neutrals
colors:
  ink-primary: "#1c1917"
  ink-secondary: "#292524"
  ink-tertiary: "#78716c"
  paper: "#fafaf9"
  surface: "#f5f5f4"
  border: "#d6d3d1"
  dark-bg: "#0c0a09"
  dark-surface: "#1c1917"
  dark-border: "#292524"
  destructive: "#dc2626"
  dark-destructive: "#b91c1c"
typography:
  display:
    fontFamily: "\"Space Grotesk\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Helvetica Neue\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif"
    fontSize: "clamp(1.125rem, 2.5vw, 1.25rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "\"Space Grotesk\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Helvetica Neue\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "\"Space Grotesk\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Helvetica Neue\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  fab-offset: "24px"
components:
  fab-primary:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    size: "56px"
    height: "56px"
    width: "56px"
  button-solid:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  dialog-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: MiniDiary

## Overview

**Creative North Star: "The Stone Ledger"**

MiniDiary reads as a quiet desk in morning light: warm paper, ink-near-black type, and almost no chrome. Density stays low; the timeline and editor are the hero. The system rejects dashboard clutter, decorative glass, and color for its own sake. Neutrals carry every screen except destructive actions and user photos.

Depth comes from tonal steps (background, surface, border) and typography, not from thick frames or stacked cards. Motion is limited to opacity and transform on key controls, with `prefers-reduced-motion` respected globally in CSS.

**Key Characteristics:**

- Restrained palette: stone neutrals, one logical "ink" role, destructive red only for real risk
- Geometric corners: 2px on controls, 8px on dialogs, 4px default token
- Space Grotesk for Latin with system CJK fallbacks
- Flat layers: subtle warm-tinted shadows when needed, never heavy drop-shadow UI chrome
- Touch targets: 48px minimum on icon controls in the shell

## Colors

The character is warm mineral paper: slightly cream off-white, charcoal ink, cool brown grays for secondary type. Dark mode inverts the stack while keeping the same relationships (light text on void-like background, not neon accents).

### Primary

- **Charcoal Ink** (`#1c1917` / light foreground): main text, icons, solid buttons, and the FAB in light mode (via `bg-foreground`). This is the single dominant dark.

### Secondary

- **Pressed Stone** (`#292524` light, `#a8a29e` dark for secondary-foreground): secondary lines of text, dark-mode secondary labels.

### Tertiary

- **Mist Gray** (`#78716c`): captions, placeholder tone, de-emphasized metadata.

### Neutral

- **Paper** (`#fafaf9`): app background in light; card and popover base where components need a surface.
- **Sheet Surface** (`#f5f5f4`): subtle lift for muted/accent/surface-hovered areas and secondary blocks.
- **Rule Line** (`#d6d3d1` / `#292524` dark): hairline borders, dividers, input strokes.
- **Night Field** (`#0c0a09` background dark): deep backdrop in dark mode; surfaces step up to `#1c1917`.

### Named Rules

**The One-Voice Ink Rule.** Color never competes with content. The only strong hues are ink neutrals, destructive red, and user imagery. No marketing gradients, no extra accent colors for "fun."

**The Destructive-Only-Red Rule.** Saturated red appears for destructive affordances and errors, not decoration.

## Typography

**Display / Title Font:** Space Grotesk (with system UI stack and CJK fallbacks).  
**Body Font:** same stack. No separate label font: hierarchy uses weight and size.

**Character:** Geometric, Swiss-adjacent, slightly technical but calm. Titles get negative letter-spacing; body stays open with ~1.6 line height. Keep body lines within roughly 65–75ch where paragraphs run long (shell already constrains many views with `max-w` patterns).

### Hierarchy

- **Title / section** (600, `text-lg` in dialogs, `font-medium` in top bar, tight leading ~1.3): screen titles, dialog headings.
- **Body** (400, 16px root, 1.6 line-height): entry content, descriptions, long copy.
- **Label / UI** (500, 14px `text-sm` where used): button labels, compact supporting text, dialog secondary line.
- **Caption / metadata** (400–500, `text-muted-foreground`, smaller): timestamps, hints.

### Named Rules

**The Weight-Over-Color Rule.** Step hierarchy with weight and size first; do not add new colors to "make something pop."

## Elevation

The UI is structurally **flat** with **light, warm-tinted shadows** for floating elements only. Elevation is not used to build dense stacks of cards. Semi-transparent black scrims (e.g. `bg-black/50` on dialogs) separate modal layers from content.

### Shadow Vocabulary

- **xs** (`0 1px 2px rgba(28, 25, 23, 0.04)` light): barely lifted controls if needed.
- **sm** (`0 1px 3px rgba(28, 25, 23, 0.08)` light): light panels.
- **md** (`0 2px 8px rgba(28, 25, 23, 0.1)` light): FAB at rest, secondary floating noise.
- **lg** (`0 4px 16px rgba(28, 25, 23, 0.14)` light): stronger lift (dark mode uses deeper black-tinted shadows for the same scale).

In dark mode, the same four steps use higher-opacity black for separation without glowing halos.

### Named Rules

**The No-Card-Stack Rule.** Do not add nested cards with competing shadows. One surface, one border or shadow reason.

**The Flat-Content Rule.** Day items prefer dividers and spacing over boxed cards; borders are 1px `border` token, not heavy frames.

## Components

### Floating Action Button (FAB)

- **Shape:** 56×56px (`h-14 w-14`), `rounded-sm` (2px) on a square, not a full circle.
- **Light mode:** `bg-foreground` + `text-background` (ink on paper), `shadow-md`, hover to `shadow-lg` with `scale(1.05)` via motion (transform only).
- **Focus:** 2px outline, offset 2, `outline-ring` color.

### Top Bar

- **Container:** Sticky, `h-14`, `border-b border-border`, `bg-background`, max content width 600px centered, horizontal padding `px-5`.
- **Icon buttons:** 48×48 touch target, `rounded-sm`, transparent default, `hover:bg-surface`, `active:opacity-60`, 24px icons, foreground color.

### Dialogs (confirm pattern)

- **Scrim:** Full viewport, `bg-black/50`, click-outside to dismiss.
- **Panel:** `max-w-sm`, `rounded-lg` (8px), `bg-card`, `p-6`, `shadow-xl`, title `text-lg font-semibold tracking-tight`, message `text-sm text-muted-foreground`.
- **Actions:** primary solid button `bg-foreground text-background`, secondary ghost `hover:bg-muted`; destructive uses `bg-destructive` / `text-destructive-foreground`.

### List / timeline rows

- Content-first rows with spacing and hairline dividers; avoid wrapping each entry in a heavy bordered card unless the spec of a feature demands it.

### Empty state

- Centered block with `py-16`, line-art icon at low-contrast `text-muted-foreground/30`, short title and one supporting line, gentle fade-in (opacity + transform).

## Do's and Don'ts

### Do:

- **Do** keep body copy on the default stack and 1.6 line-height for readability in both scripts.
- **Do** use `border-border` and `bg-background` / `bg-surface` for separation before reaching for shadow.
- **Do** use `focus-visible` outlines (2px, 2px offset) for keyboard users.
- **Do** treat `foreground` and `background` as the semantic pair for high-contrast actions (FAB, primary solid buttons).

### Don't:

- **Don't** use loud gradient hero aesthetics or “wellness” stock illustration clutter (see PRODUCT.md anti-references).
- **Don't** add gamification streaks, badges, or noisy celebration UI for basic writing.
- **Don't** use dense dashboard chrome, nested cards, or decorative glass panels that obscure content.
- **Don't** use surveillance-adjacent dark patterns: forced accounts, ambiguous data copy.
- **Don't** introduce colored border-left stripes, gradient text, or glassmorphism as a default surface treatment.
- **Don't** animate width, height, margin, or padding; keep motion to transform and opacity.
