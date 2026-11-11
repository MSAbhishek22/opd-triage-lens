# Submission Pack — Future Health Digital Innovation Challenge 2026

**Project:** OPD Triage Lens — deterministic 4-colour symptom triage for Indian OPDs
**Author:** M S Abhishek (solo) — GitHub MSAbhishek22, msabhishekbdps@gmail.com,
Shobhit University, Meerut, BTech CSE 7th sem, 18+
**Event:** Future Health Digital Innovation Challenge (Hack2Skill)
**Prototype due:** Thu 20 Nov 2026 (with technical documentation, assumptions, limitations)
**Registration:** DONE 7 Nov 2026 (solo, statement #4) — per parent records.
**Prize:** $105,000 total cash across the top three teams ($50,000 / $35,000 / $20,000);
top three present at GITEX 7–11 Dec 2026. Travel-cost responsibility unverified — confirm if shortlisted.

## Statements (verbatim from the official page, read 6 Nov 2026)
- **#4 Precision Prevention and Screening:** "How might we identify children, adults and communities with unmet or elevated health risk and connect them to the right preventive intervention, Well-Child Visit or Adult comprehensive screening pathway, at the right time, through approaches that are personalized and culturally appropriate?"
- **#5 Closing the Screening-to-Care Loop:** "How might we use innovative, low-friction approaches to ensure that every actionable screening result leads to timely communication, rapid patient-to-clinician or clinician-to-clinician consultation, appropriate confirmation and follow-up, clear ownership, completed referral, and documented closure across providers and care settings?"

## What is submitted
Working prototype (single-page web app) + technical documentation (README.md +
this pack + design constitution + interaction inventory + assumptions/limitations below).

## Links (TBD — parent fills after repo + deploy)
- Live demo: [TBD — Vercel URL after deploy]
- Source: [TBD — https://github.com/MSAbhishek22/opd-triage-lens after push]
- Demo video: [TBD — record from the LIVE URL after deploy, ≤ 3 min recommended]

## Submission text (paste-ready)
**Title:** OPD Triage Lens — 4-colour symptom triage for Indian OPDs
**Tagline:** The OPD queue, sorted by urgency — not by arrival. Deterministic, explainable, Hinglish-first.
**Problem:** An Indian OPD sees hundreds of patients a day and the queue is first-come-first-served — a patient with chest pain waits behind a patient with a cold. General AI chatbots answer symptom questions fluently and hallucinate; a wrong urgency call is worse than no call.
**What it does:** Type symptoms in Hinglish or English. A deterministic rule engine (no model, no API, no guess) assigns one of four colours — RED emergency, AMBER same-day, GREEN routine, BLUE self-care — gives capacity-aware slot advice for the OPD's actual load, and writes a structured doctor handoff (symptoms verbatim, matched rule, confidence, red flags, vitals) the patient can copy, download or print. Symptoms outside the corpus get an honest "cannot triage — see a clinician", never a guessed colour.
**How it works:** 34 written rules (English + Hinglish keywords) + 4 combination rules (chest pain + breathlessness is an emergency even though chest pain alone is not) + explicit modifiers (duration 3+ days, child with fever, SpO2 < 92%). Everything runs in the browser; no data leaves the device.
**Measured proof:** 45/45 = 100% agreement on our own 45-case labelled test set (RED 10/10, AMBER 15/15, GREEN 10/10, BLUE 5/5, UNKNOWN 5/5). The set is published in the repo; anyone can re-run it with `node tests/test.js`. This is a correctness check on the rule book, not a claim about real patients.
**What makes it different:** Most symptom tools wrap a language model and hope it stays safe. OPD Triage Lens inverts that: a small rule book a clinician can audit beats a large model nobody can check. The refusal to triage is a feature, not a gap. Privacy is structural — with no server and no model, there is nothing to leak.
**Built for this hackathon:** Fresh build 12 Nov 2026, solo, free. Tests: 23/23 unit checks pass, 21/21 headless end-to-end checks pass (desktop + mobile, 0 console errors). Scripture of record: none — the corpus is our own labelled set, not real patient data.
**Tech stack:** Vanilla HTML/CSS/JavaScript — no framework, no build step, no dependencies, no environment variables. Static site on Vercel (free tier). Deterministic engine in plain JS over a bundled rule corpus. Tests: dependency-free Node assertions (23) + Playwright end-to-end (21).

## Assumptions & limitations (required by the official page)
1. This triages **urgency for OPD flow**; it does not diagnose, prescribe, or replace a clinician. Every screen carries that disclaimer.
2. The corpus covers common OPD presentations only (34 rules). Anything outside it is refused, not guessed.
3. Accuracy (45/45) is measured on our own labelled test set, built by us — not on real patients, not a clinical validation.
4. Vitals are patient-entered and unverified; they are shown as entered in the handoff.
5. Voice input uses the browser's built-in speech service (Chrome/Edge); typing is the primary path.
6. Slot advice assumes the OPD load selector reflects reality; it is a guide, not a booking.
7. No real patient data was used anywhere in the build or the demo. All demo cases are synthetic and labelled as such.
8. Commercial path: a one-clinic OPD pilot proposal (one primary-care partner, one town, one module) — a proposal, not a claimed partnership.

## Judging map (official criteria, in their order)
- Health impact and clinical relevance → urgency sort + red-flag routing + screening-vs-diagnosis boundary.
- Technical depth and architecture → deterministic explainable engine, local-first architecture, combination rules.
- Working solution and demonstration quality → live triage + handoff, scripted RED/AMBER/refusal cases.
- Responsible AI, safety and data governance → refusal path, no data leaves the device, limitations doc.
- Scalability and deployment readiness → stateless front end, no server dependency.
- Commercial viability and path to pilot → one-clinic pilot proposal (see §8).

## Still needed (parent — before 20 Nov)
1. **GitHub repo** `MSAbhishek22/opd-triage-lens` + push (manifest at `~/workspace/hackathons/opd-triage-lens-paths`).
2. **Vercel deploy** (static, no build, no env vars) + public verify + Deployment Protection OFF.
3. **Demo video from the LIVE URL** (60–120 s: problem → live triage RED + AMBER + refusal → dial → handoff → close).
4. **File the prototype + documentation** on Hack2Skill by Thu 20 Nov 2026.
5. Re-confirm the submission form fields + deadline inside the Hack2Skill dashboard at submit time.

## Do NOT claim
- Any clinical validation, any real-patient accuracy, any hospital partnership, any live deployment (until the parent verifies it), any diagnosis capability.
