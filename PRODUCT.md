# Product

## Register

product

## Users

People who want to capture quick thoughts, chores, or work logs with minimal friction. They often value privacy and offline use: data should stay on the device by default, with no sign-up wall. Context varies from a few seconds at a bus stop to a calmer block of time at a desk; the app should feel fast and unobtrusive in both.

## Product Purpose

MiniDiary is a local-first PWA journal. It offers a timeline-first experience inspired by social feeds, but content belongs entirely to the user. Success is “open, write, leave” with trustworthy storage, optional sync when implemented, and a UI that never competes with the words on the page.

## Brand Personality

Calm, literate, and precise. Three words: **restrained**, **typographic**, **trustworthy**. The interface should feel like quiet paper and ink: warm neutral stone, strong hierarchy, and motion that nudges attention without performance theater.

## Anti-references

- Loud gradient hero aesthetics and “wellness” stock illustration clutter.
- Gamification streaks, badges, and noisy celebration UI for basic writing.
- Dense dashboard chrome, nested cards, and decorative glass panels that obscure content.
- Surveillance-adjacent patterns: dark patterns to force accounts, or ambiguous data handling copy.

## Design Principles

- **Content is the product**: every screen serves reading or writing; chrome stays secondary.
- **Privacy by architecture**: local storage first; cloud is an explicit, user-controlled add-on.
- **Typography carries hierarchy**: scale and weight do the work; avoid ornamental frames.
- **Restraint in motion**: animate compositor-friendly properties only; support reduced motion.
- **Honest affordances**: clear empty states, errors, and sync status without marketing filler.

## Accessibility & Inclusion

Target WCAG 2.1 AA for text contrast and focus where applicable. Respect `prefers-reduced-motion`. Clear visible focus and adequate touch targets on mobile. Color is not the only signal for state; pair with weight, copy, or icons. CJK and Latin coexist; body text should remain readable with system CJK fallbacks when Latin display fonts do not cover glyphs.