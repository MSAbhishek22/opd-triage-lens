# Project Design Registry — OPD Triage Lens (Future Health)
Comparison vs the three most recent rulebook-era projects, from recorded design
descriptions (previous project screenshots were inspected for Grace Notes and
the OPD screenshots in this folder; CageCheck/Spec Ghost from their recorded
design descriptions — noted honestly).

## This project
- Concept: "OPD token desk" — a printed queue token: paper, ink navy, a big
  colour, a number, a stamp. Swiss editorial clinical.
- Palette: paper `#fafaf6` + ink navy `#14213d` + 4-colour triage band
  (RED/AMBER/GREEN/BLUE); mono data labels.
- Type: system-ui grotesk, weight 800 display, mono for data.
- Layout: hero statement + 4-colour band + stats; two-column counter
  (intake left, sticky verdict right); CSS 3D triage dial; 3-column rule grid.
- Signature interaction: deterministic verdict card with cited rule + doctor
  handoff (copy/print/download); dial needle follows the verdict.
- 3D: CSS 3D conic-gradient dial with pointer tilt + needle; static fallback.

## Compared projects
1. Grace Notes (AI for Church) — parchment `#f7f1e3` + gold + ruby, serif
   scripture voice, stained-glass window hero, chapter numerals.
   DIFFERENCE: OPD is Swiss grotesk, not serif; ink navy, not gold; its hero
   is a flat colour band, not a window; its interaction is a verdict + handoff,
   not a Q&A. Shared "numbered sections" device, different colour, type, tone
   and purpose.
2. CageCheck (Vultr) — paper / ink / stamp, stamped receipts, guard verdicts
   (BLOCKED/PASSED), guard-console layout.
   DIFFERENCE: OPD shares the paper/ink family but is a token desk, not a
   guard console; its verdict is a clinical urgency colour, not a security
   stamp; its 3D is a dial, not a cage; its layout is a two-column counter,
   not a console. The stamp device is deliberately NOT reused — red-flag
   stamps appear only as small labels on rule cards.
3. Spec Ghost (Kiroween) — near-black brown + candlelight amber, Georgia
   serif, 860px single column, candlelit document.
   DIFFERENCE: OPD is light (paper), sans, navy-led, two-column with a sticky
   verdict — the opposite register: a bright OPD counter, not a dark document.

Verdict: recognisably different in concept, palette, type, layout, interaction
and motion. UI_DISTINCTIVENESS: PASS.
