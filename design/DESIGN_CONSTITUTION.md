# OPD Triage Lens — Design Constitution

**Project:** OPD Triage Lens — deterministic 4-colour symptom triage for Indian OPDs
**Event:** Future Health Digital Innovation Challenge 2026 (statements #4/#5)
**Author:** M S Abhishek · **Date:** 12 Nov 2026 · **Version:** 1.0

## Personality & emotional tone
Calm, clinical, accountable. A hospital OPD counter at 9 am — not a wellness app, not a chatbot. The product sorts, it never soothes with false certainty: when it does not know, it says so in plain language. Urgency is shown, not shouted; the only loud element is the red emergency band, and it earns its volume.

## Target user & context
A patient (or their family member) in an Indian OPD queue, on a phone, often anxious, often describing symptoms in Hinglish. Also the OPD desk staff who need a fast, auditable sort. They want one answer — how soon do I need to be seen? — and a summary they can hand to the doctor. They do not want a diagnosis, a chat, or a form with twenty fields.

## Central visual metaphor
**The OPD token desk.** A printed queue token: paper, ink, a big colour, a number, a stamp. The hero is a four-colour band like the triage tags on a hospital trolley. Data labels are monospace, like a printed token slip. The verdict card is a token: colour on top, rule cited underneath, slot advice at the bottom.

## Palette (semantic roles)
| Role | Colour | Use |
|---|---|---|
| Paper `#fafaf6` | page background | the desk everything sits on |
| Ink navy `#14213d` | primary text, primary buttons, borders | authority, not decoration |
| Soft ink `#4a5568` | secondary text | |
| Faint ink `#718096` | meta labels, fine print | |
| Rule `#ddd8cc` | hairline dividers | |
| RED `#c81e1e` | emergency verdicts, disclaimer border | never a background wash |
| AMBER `#d97706` (text `#b45309`) | urgent verdicts | |
| GREEN `#15803d` | routine verdicts | |
| BLUE `#1d4ed8` | self-care verdicts, links, focus | |
| Card `#ffffff` | result / rule cards | |

## Typography
- Display / headings: system-ui stack, weight 800, tight tracking (-0.02 to -0.03em). No webfont — fast, offline.
- Body / UI: system-ui stack, 17px, line-height 1.55.
- Data / labels / codes: ui-monospace stack — token-slip voice for rules, keywords, stats, handoff.
- Hierarchy: hero 2.4–4.2rem → section 1.7–2.4rem → card titles 16px → body 17px → meta 11–13px mono uppercase.

## Layout & grid
Single page, max-width 1120px. Hero: full-width statement + 4-colour band + stats row. Counter: two columns (intake left, verdict right, sticky) collapsing to one under 960px. Dial: 380px disc + legend. Rule book: 3-column card grid (2 under 960px, 1 under 620px). Sections numbered 01–05 in mono — a counter-ticket device.

## Navigation & IA
Sticky header: brand + 4 anchor links (Triage / The dial / Rule book / How it works) + low-motion toggle. Skip link first in tab order. One page, five sections, in the order a visitor thinks: understand → triage → see the dial → inspect the rules → understand the limits.

## Components & interaction patterns
- Buttons: square, 2px ink border; primary is ink-on-paper; ghost is outlined. Hover lifts 1px (transform only).
- Chips (quick symptoms): pill, mono; click fills the textarea and runs triage immediately.
- Radio groups: fieldsets with legends (age group, OPD load).
- Verdict card: 2px border in the verdict colour; big mono colour word; confidence badge; facts table (rule / words / slot); notes in amber-tinted boxes; disclaimer in red box.
- Handoff: mono pre block + Copy / Download .md / Print actions.
- Rule cards: 8px colour top border, mono tag, keyword list, advice, RED FLAG stamp for red-flag rules.
- Dial: conic-gradient disc (RED/AMBER/GREEN/BLUE), pointer tilt (rotateX/rotateY, transform only), needle rotates to the verdict colour; quadrants are buttons that filter the rule book.

## Motion language
Fade + 8px rise on the verdict card; 1px lift on buttons/chips; needle sweep 0.6s cubic-bezier; dial tilt follows the pointer (max 14deg). All motion is transform/opacity only. `prefers-reduced-motion` disables it; a Low motion toggle persists the choice in localStorage.

## 3D concept
**The triage dial.** A four-quadrant disc that tilts toward the pointer in CSS 3D — it exists to make the four-colour system tangible: one disc, four colours, and the needle that points at your verdict. It is the product's central metaphor made touchable, and its quadrants are the filter for the rule book (interaction, not decoration). Fallback: static disc under reduced motion / touch / low-motion mode; the quadrant buttons still work.

## Responsive behaviour
- Desktop ≥960px: two-column counter, sticky verdict, 3-column rule grid.
- Tablet 620–960px: single-column counter, 2-column rule grid, dial stacks above legend.
- Mobile ≤620px: 2×2 colour band, 1-column rule grid, brand tag hidden, sticky header nav hidden (anchors still reachable by scroll).
- No horizontal overflow at 390px (verified in E2E).

## Accessibility & reduced-motion
Semantic landmarks, skip link, labelled inputs, fieldset legends, `aria-live="polite"` on the verdict region, focus-visible outlines, colour never the only signal (colour word + label + text). Reduced-motion media query + low-motion toggle disable animation; print stylesheet prints only the handoff card.

## References (design research, inspected 12 Nov 2026)
1. NHS 111 online (nhs.uk) — same category: symptom triage with urgency routing; learned: short sentences, one question at a time, red-flag routing first. Not copied: NHS visual system, question-tree flow.
2. Ada Health app — same category: symptom assessment; learned: result cards with "what this means" + next steps. Not copied: its probability language — we never give a probability, only a rule.
3. Linear (linear.app) — interaction/motion: restrained, transform-only micro-interactions; learned: 1px lifts and fast fades. Not copied: dark theme, product chrome.
4. The Pudding (pudding.cool) — typography/hierarchy: editorial numerals + mono data labels; learned: big numbers with small caps labels. Not copied: its illustrative style.
5. Google Maps 3D / Apple Maps Look Around — spatial: a tilted disc as a map metaphor; learned: pointer-driven tilt communicates "you are looking at a thing". Not copied: map tiles, WebGL — ours is pure CSS 3D.

## Original decisions
- Token-desk metaphor instead of a chatbot or a dashboard.
- The rule book is published on the page itself — transparency as the design.
- The refusal ("cannot triage") is a first-class visual state, not an error.
- Voice input is offered but typing is primary; the note says so honestly.
