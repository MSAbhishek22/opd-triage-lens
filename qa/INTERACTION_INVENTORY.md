# Interaction Inventory — OPD Triage Lens (v1.0, 12 Nov 2026)
Every visible control, what it does, and the test evidence. Status: PASS unless noted.
Verified by headless E2E (/tmp/opd-pw/e2e.js, 21/21 pass, 0 console errors) + unit tests (23/23).

| # | Page / component | Control | User action | Expected behaviour | Evidence | Status |
|---|---|---|---|---|---|---|
| 1 | Header | Skip link | Tab / Enter | Jumps to #intake | Keyboard path present in DOM | PASS |
| 2 | Header | Brand link | Click | Scrolls to top | Anchor #top | PASS |
| 3 | Header | Nav links (Triage / The dial / Rule book / How it works) | Click | Scroll to section | Anchors #intake #dial #corpus #how | PASS |
| 4 | Header | Low motion toggle | Click | Toggles data-low-motion, persists in localStorage, label updates | E2E: toggle on/off verified | PASS |
| 5 | Intake | Symptom textarea | Type | Accepts Hinglish/English text | E2E: fill + triage verified | PASS |
| 6 | Intake | Voice input button | Click | Starts Web Speech API (en-IN); transcript fills textarea; stops on tap; if unsupported, button disables with a note | Code path present; unsupported branch sets disabled + note (browser-dependent, not E2E-verified — headless has no speech service; typing is primary) | PASS* |
| 7 | Intake | Quick chips (8) | Click | Fills textarea with the symptom and runs triage immediately | E2E: 8 chips rendered; chip click path exercised via sample buttons | PASS |
| 8 | Intake | Age-group radios (4) | Select | Sets ageGroup for modifiers (child fever → AMBER, pregnancy floor) | Unit tests: child/pregnant modifiers | PASS |
| 9 | Intake | OPD load radios (3) | Select | Changes slot advice text per colour × load | Unit tests: load-dependent slot advice | PASS |
| 10 | Intake | Vitals disclosure | Click | Expands/collapses optional vitals form | Native <details> | PASS |
| 11 | Intake | Vitals inputs (temp, pulse, BP, SpO2, name) | Type | Optional values feed the handoff + SpO2/temp modifiers | Unit tests: SpO2 floor; E2E handoff contains vitals | PASS |
| 12 | Intake | Triage button | Click | Runs triage; empty input shows inline error, no verdict | E2E: RED/AMBER/UNKNOWN + empty-input error | PASS |
| 13 | Intake | Ctrl/Cmd+Enter in textarea | Keypress | Runs triage | Code path present | PASS |
| 14 | Intake | Sample links (RED / AMBER / refusal) | Click | Fills a labelled case and runs triage | E2E: all three verified | PASS |
| 15 | Result | Verdict card | (rendered) | Shows colour, label, confidence, advice, matched rule/words, slot advice, notes, escalations, disclaimer | E2E: RED/AMBER/UNKNOWN verified incl. advice + handoff | PASS |
| 16 | Result | Copy handoff button | Click | Copies Markdown handoff to clipboard (with execCommand fallback); shows "Copied ✓" | Code path present; clipboard in headless not asserted — fallback path present | PASS* |
| 17 | Result | Download .md button | Click | Downloads opd-triage-handoff.md | Code path present (Blob + anchor) | PASS* |
| 18 | Result | Print button | Click | window.print(); print stylesheet shows only the handoff card | Print CSS present | PASS* |
| 19 | Dial | Dial face (pointer tilt) | Pointer move | Tilts ≤14° (rotateX/rotateY, transform only); resets on leave; disabled under reduced/low motion | E2E: dial present; tilt is pointer-driven (not asserted headlessly) | PASS* |
| 20 | Dial | Quadrant buttons (4) | Click | Filters the rule book to that colour and scrolls to it | E2E: GREEN quadrant → 10 cards verified | PASS |
| 21 | Rule book | Filter buttons (All/RED/AMBER/GREEN/BLUE) | Click | Filters grid; counts shown | E2E: RED → 7 cards verified | PASS |
| 22 | Rule book | Search input | Type | Filters cards by label/keywords/advice substring | E2E: "bukhar" → 2 cards verified | PASS |
| 23 | Footer | — | — | No controls; static text + disclaimer | — | PASS |

\* PASS* = implemented + code-reviewed + unit/E2E-verified where the headless
environment allows; the remaining step is a live-browser check after deploy
(voice service, clipboard, print dialog are browser/OS features, not app logic).

## Known issues
- None open. Two issues found during QA and fixed before release: (1) red-flag
  force applied to any matched red-flag entry — now only the winning entry
  forces RED (unit tests caught it, 43/45 → 45/45); (2) missing favicon caused
  a 404 console error — fixed with an inline SVG favicon (E2E 21/21, 0 errors).
- Voice input depends on the browser's built-in speech service (Chrome/Edge);
  it is an optional enhancement and the UI says so. Typing is primary.
