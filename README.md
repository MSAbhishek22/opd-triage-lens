# OPD Triage Lens

**Deterministic 4-colour symptom triage for Indian OPDs — Future Health Digital Innovation Challenge 2026, statements #4 (Precision Prevention and Screening) and #5 (Closing the Screening-to-Care Loop).**

**Live demo:** https://opd-triage-lens.vercel.app

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

## Prevent mode (added 18 Nov 2026, reviewer feedback)
A second mode beside Triage, on the same page — switch with the Triage / Prevent control in the hero or the header nav. It answers the review team's 17 Nov feedback ("feels more like a static application… focuses primarily on acute symptom triage instead of proactive screening").

- **Consent gate first:** two checkboxes (screening-only, local-only); Continue stays disabled until both are checked. Inputs never leave the browser.
- **Risk profiler:** age band, family history in broad categories (diabetes / heart disease in parents or siblings), lifestyle factors, and markers you already know. Three transparent weighted scores (metabolic-lifestyle, cardiovascular-lifestyle, sleep/stress wellbeing), each listing exactly which inputs moved it and by how many points. Thresholds: under 35 Lower, 35–64 Review, 65+ Strong. The urgent screen comes only from the "worrying symptoms right now" checkbox — never from a score.
- **Screening scheduler:** a dated list of preventive checks (blood pressure, blood sugar, cholesterol, weight/BMI, vision, dental, general review) — annual / 2-yearly / 5-yearly by risk band (6-monthly for the strongest band), with due dates from today, referral pathways (self-care / primary-care navigation / primary-care promptly), and a check-off list with a referral-completion counter. Items linked to the inputs that moved the score are flagged.
- **Three synthetic demo personas** (Low / Medium / Red-flag), labelled synthetic: Low scores 0/0/0, Medium scores 53/42/28 (Review), Red-flag scores 100/100/64 (Strong) with the urgent screen. Time to next step is shown per band: Lower — none implied; Review — within 4 weeks; Strong — within 1 week; Urgent — now.
- **Prevention plan:** a Markdown summary (inputs, scores with contributions, schedule with due dates, next step) — copy, download, or print, like the triage handoff.
- **Documentation on the page:** assumptions, limitations and data-use statement in the Prevent flow itself.

## Measured proof (not adjectives)
Accuracy on our own **45-case labelled test set: 45/45 = 100%** — RED 10/10, AMBER 15/15, GREEN 10/10, BLUE 5/5, UNKNOWN 5/5. The set is published in `corpus.js`; re-run it with `node tests/test.js`. This is agreement between the engine and our own labels — a correctness check on the rule book, **not** a claim about real patients. The labelled set is built by us, not real patient data.

## Tests
```bash
node tests/test.js   # or: npm test
```
- **Unit tests: 39/39 PASS** (23 triage + 16 Prevent: score bands, personas, family-history isolation, scheduler intervals/due dates/pathways, next-step times, summary, empty states).
- **Headless E2E: 33/33 PASS** (Playwright, Chromium; desktop 1280px + mobile 390px, 0 console errors, no horizontal overflow). E2E script: `/tmp/opd-prevent-e2e.py` (ephemeral; re-runnable).

## Run locally
```bash
python3 -m http.server 8000   # then open http://127.0.0.1:8000/
```
No build step, no dependencies, no backend, no environment variables. Static site — deploys cleanly to Vercel (see `vercel.json` + `deployment/DEPLOYMENT_RUNBOOK.md`).

## Project structure
```
index.html            — the app (single page, Triage + Prevent modes)
styles.css            — "OPD token desk" design system
app.js                — UI wiring (voice, dial, handoff, corpus explorer, Prevent flow)
corpus.js             — 34 rules + 4 combination rules + 45 labelled cases
engine.js             — deterministic triage engine (works in browser + Node)
prevent.js            — Prevent engine: profiler scoring + scheduler + personas (browser + Node)
tests/test.js         — 39 Node assertions (23 triage + 16 Prevent)
design/               — DESIGN_CONSTITUTION.md, PROJECT_DESIGN_REGISTRY.md
qa/                   — INTERACTION_INVENTORY.md
submission/           — SUBMISSION_PACK.md
deployment/           — DEPLOYMENT_RUNBOOK.md
vercel.json           — static deploy config
```

## Honest limits
- This triages **urgency for OPD flow**; it does not diagnose, prescribe, or replace a clinician. Every screen carries that disclaimer.
- **Prevent is screening only, not a diagnosis.** Scores are transparent rule-based sums, not a statistical model, not trained on patient data, not clinically validated. A Lower signal does not rule anything out; a Strong signal does not mean something is wrong.
- The corpus covers common OPD presentations only (34 rules). Anything outside it is refused, not guessed.
- Accuracy is measured on our own labelled set, not on real patients.
- Voice input uses the browser's built-in speech service; it is optional and typing always works.
- Vitals are patient-entered and unverified — they are shown as entered in the handoff.

## Hackathon fit
- **Statement #4 — Precision Prevention and Screening:** identifies people with unmet/elevated risk and connects them to the right pathway at the right time, in Hinglish as well as English — personalized and culturally appropriate. Prevent mode is the direct answer: profiler + scheduler, with the Adult comprehensive screening pathway named as an option a clinician may consider.
- **Statement #5 — Closing the Screening-to-Care Loop:** every actionable result becomes a structured, documented handoff with clear ownership (the patient carries it to the clinician) and a closed loop — triage → slot → handoff. Prevent closes the loop the other way: signal → dated schedule → check-off list with a referral-completion counter → prevention plan carried to the clinician.
- Judging map: health impact (urgency sort + red-flag routing), technical depth (deterministic explainable engine, local-first), working demo (live triage + handoff), responsible AI (refusal path, consent-free local data, limitations doc), scalability (stateless front end), commercial path (one-clinic OPD pilot proposal — a proposal, not a claimed partnership).

## Author
M S Abhishek (Shobhit University, Meerut, BTech CSE 7th sem) — solo. MIT licence.
