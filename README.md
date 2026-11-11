# OPD Triage Lens

**Deterministic 4-colour symptom triage for Indian OPDs — Future Health Digital Innovation Challenge 2026, statements #4 (Precision Prevention and Screening) and #5 (Closing the Screening-to-Care Loop).**

> **Not a diagnosis.** OPD Triage Lens triages urgency for OPD flow only. It never diagnoses, never prescribes. In an emergency, call 108.

## The problem
An Indian OPD sees hundreds of patients a day, and the queue is first-come-first-served. A patient with chest pain waits behind a patient with a cold. The person at the desk sorts by arrival, not by urgency — because there is no fast, explainable, auditable way to sort. General AI chatbots answer symptom questions fluently and hallucinate; a wrong urgency call is worse than no call.

## What it does
Type symptoms in Hinglish or English. A deterministic rule engine — no model, no API, no guess — assigns one of four colours, tells you which OPD slot to take, and writes the handoff summary your doctor actually wants to read.

- **4 colours:** RED (emergency, now) · AMBER (urgent, same-day) · GREEN (routine, next slot) · BLUE (self-care).
- **34 written rules** (English + Hinglish keywords) + **4 combination rules** — chest pain + breathlessness is an emergency even though chest pain alone is not.
- **Modifiers, each explicit:** duration (fever 3+ days escalates), age group (child with fever → AMBER), vitals (SpO2 < 92% raises the floor).
- **Capacity-aware slot advice:** the same AMBER verdict reads differently when the OPD is light vs. crowded.
- **Doctor handoff:** structured Markdown summary (symptoms verbatim, colour, matched rule, confidence, red flags, vitals, slot advice) — copy, download, or print.
- **Honest refusal:** symptoms outside the corpus get "cannot triage — see a clinician", never a guessed colour.
- **Voice input** via the browser's built-in speech service (Chrome/Edge); typing is the primary path.
- **3D triage dial:** a CSS 3D disc that tilts with the pointer; the needle points at your verdict; quadrants filter the rule book.
- **The rule book is published on the page** — every rule, keyword and advice is inspectable.

## Measured proof (not adjectives)
Accuracy on our own **45-case labelled test set: 45/45 = 100%** — RED 10/10, AMBER 15/15, GREEN 10/10, BLUE 5/5, UNKNOWN 5/5. The set is published in `corpus.js`; re-run it with `node tests/test.js`. This is agreement between the engine and our own labels — a correctness check on the rule book, **not** a claim about real patients. The labelled set is built by us, not real patient data.

## Tests
```bash
node tests/test.js   # or: npm test
```
- **Unit tests: 23/23 PASS** (corpus integrity, labelled accuracy, individual outcomes, modifiers, handoff, helpers).
- **Headless E2E: 21/21 PASS** (playwright-core, cached Chromium; desktop 1280px + mobile 390px, 0 console errors, no horizontal overflow). E2E script kept at `/tmp/opd-pw/e2e.js` (ephemeral; re-runnable from the commands above).

## Run locally
```bash
python3 -m http.server 8000   # then open http://127.0.0.1:8000/
```
No build step, no dependencies, no backend, no environment variables. Static site — deploys cleanly to Vercel (see `vercel.json` + `deployment/DEPLOYMENT_RUNBOOK.md`).

## Project structure
```
index.html            — the app (single page)
styles.css            — "OPD token desk" design system
app.js                — UI wiring (voice, dial, handoff, corpus explorer)
corpus.js             — 34 rules + 4 combination rules + 45 labelled cases
engine.js             — deterministic triage engine (works in browser + Node)
tests/test.js         — 23 Node assertions
design/               — DESIGN_CONSTITUTION.md, PROJECT_DESIGN_REGISTRY.md
qa/                   — INTERACTION_INVENTORY.md
submission/           — SUBMISSION_PACK.md
deployment/           — DEPLOYMENT_RUNBOOK.md
vercel.json           — static deploy config
```

## Honest limits
- This triages **urgency for OPD flow**; it does not diagnose, prescribe, or replace a clinician. Every screen carries that disclaimer.
- The corpus covers common OPD presentations only (34 rules). Anything outside it is refused, not guessed.
- Accuracy is measured on our own labelled set, not on real patients.
- Voice input uses the browser's built-in speech service; it is optional and typing always works.
- Vitals are patient-entered and unverified — they are shown as entered in the handoff.

## Hackathon fit
- **Statement #4 — Precision Prevention and Screening:** identifies people with unmet/elevated risk and connects them to the right pathway at the right time, in Hinglish as well as English — personalized and culturally appropriate.
- **Statement #5 — Closing the Screening-to-Care Loop:** every actionable result becomes a structured, documented handoff with clear ownership (the patient carries it to the clinician) and a closed loop — triage → slot → handoff.
- Judging map: health impact (urgency sort + red-flag routing), technical depth (deterministic explainable engine, local-first), working demo (live triage + handoff), responsible AI (refusal path, consent-free local data, limitations doc), scalability (stateless front end), commercial path (one-clinic OPD pilot proposal — a proposal, not a claimed partnership).

## Author
M S Abhishek (Shobhit University, Meerut, BTech CSE 7th sem) — solo. MIT licence.
