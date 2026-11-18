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
Working prototype (single-page web app, two modes: Triage + Prevent) + technical documentation (README.md +
this pack + design constitution + interaction inventory + assumptions/limitations below).

**v1.1 update (18 Nov 2026 — reviewer feedback):** the review team (17 Nov 19:30 IST) liked the deterministic Hinglish triage and doctor handoffs but called the build "more like a static application" and asked for an interactive personal health risk profiler + preventive screening scheduler with working AI logic. This re-submission adds **Prevent mode**: consent-gated risk profiler (age band, family history in broad categories, lifestyle, known markers) with three transparent weighted scores and per-factor explanations, plus a dated screening scheduler (annual / 2-yearly / 5-yearly by risk band, 6-monthly for the strongest band) with referral pathways, a check-off list with a referral-completion counter, and a prevention plan. Triage is untouched (23/23 tests still pass, corpus still 45/45).

## Links (TBD — parent fills after repo + deploy)
- Live demo: [TBD — Vercel URL after deploy]
- Source: [TBD — https://github.com/MSAbhishek22/opd-triage-lens after push]
- Demo video: [TBD — record from the LIVE URL after deploy, ≤ 3 min recommended]

## Submission text (paste-ready)
**Title:** OPD Triage Lens — 4-colour symptom triage for Indian OPDs
**Tagline:** The OPD queue, sorted by urgency — not by arrival. Deterministic, explainable, Hinglish-first.
**Problem:** An Indian OPD sees hundreds of patients a day and the queue is first-come-first-served — a patient with chest pain waits behind a patient with a cold. General AI chatbots answer symptom questions fluently and hallucinate; a wrong urgency call is worse than no call.
**What it does:** Type symptoms in Hinglish or English. A deterministic rule engine (no model, no API, no guess) assigns one of four colours — RED emergency, AMBER same-day, GREEN routine, BLUE self-care — gives capacity-aware slot advice for the OPD's actual load, and writes a structured doctor handoff (symptoms verbatim, matched rule, confidence, red flags, vitals) the patient can copy, download or print. Symptoms outside the corpus get an honest "cannot triage — see a clinician", never a guessed colour. **Prevent mode** (new in v1.1): an interactive risk profiler — age band, family history, lifestyle, known markers — with three transparent weighted scores that show exactly which inputs moved them, and a preventive screening scheduler with dated checks, referral pathways and a check-off list. Every Prevent screen states "This is screening, not a diagnosis".
**How it works:** 34 written rules (English + Hinglish keywords) + 4 combination rules (chest pain + breathlessness is an emergency even though chest pain alone is not) + explicit modifiers (duration 3+ days, child with fever, SpO2 < 92%). Prevent scores are transparent weighted sums (thresholds <35 Lower, 35–64 Review, 65+ Strong; the urgent screen comes only from the "worrying symptoms right now" checkbox, never from a score). Everything runs in the browser; no data leaves the device.
**Measured proof:** 45/45 = 100% agreement on our own 45-case labelled test set (RED 10/10, AMBER 15/15, GREEN 10/10, BLUE 5/5, UNKNOWN 5/5). The set is published in the repo; anyone can re-run it with `node tests/test.js`. This is a correctness check on the rule book, not a claim about real patients. Prevent personas are measured, not claimed: Low scores 0/0/0, Medium 53/42/28 (Review), Red-flag 100/100/64 (Strong) — all from the published rule tables in `prevent.js`.
**What makes it different:** Most symptom tools wrap a language model and hope it stays safe. OPD Triage Lens inverts that: a small rule book a clinician can audit beats a large model nobody can check. The refusal to triage is a feature, not a gap. Privacy is structural — with no server and no model, there is nothing to leak.
**Built for this hackathon:** Fresh build 12 Nov 2026, solo, free; Prevent mode added 18 Nov 2026 in direct response to reviewer feedback. Tests: 39/39 unit checks pass, 33/33 headless end-to-end checks pass (desktop + mobile, 0 console errors). Scripture of record: none — the corpus is our own labelled set, not real patient data.
**Tech stack:** Vanilla HTML/CSS/JavaScript — no framework, no build step, no dependencies, no environment variables. Static site on Vercel (free tier). Deterministic engine in plain JS over a bundled rule corpus. Tests: dependency-free Node assertions (39) + Playwright end-to-end (33).

## Assumptions & limitations (required by the official page)
1. This triages **urgency for OPD flow**; it does not diagnose, prescribe, or replace a clinician. Every screen carries that disclaimer.
2. **Prevent is screening only, not a diagnosis.** Scores are transparent rule-based sums, not a statistical model, not trained on patient data, not clinically validated. A Lower signal does not rule anything out; a Strong signal does not mean something is wrong.
3. The corpus covers common OPD presentations only (34 rules). Anything outside it is refused, not guessed.
4. Accuracy (45/45) is measured on our own labelled test set, built by us — not on real patients, not a clinical validation.
5. Vitals are patient-entered and unverified; they are shown as entered in the handoff.
6. Voice input uses the browser's built-in speech service (Chrome/Edge); typing is the primary path.
7. Slot advice assumes the OPD load selector reflects reality; it is a guide, not a booking.
8. No real patient data was used anywhere in the build or the demo. All demo cases are synthetic and labelled as such.
9. Family history is asked only in broad categories (diabetes / heart disease in parents or siblings) — never in detail. The profiler does not consider medicines, pregnancy, or any condition the user may already have.
10. Prevent schedule check-off is in-memory only (resets when the page closes); nothing is stored online.
11. Commercial path: a one-clinic OPD pilot proposal (one primary-care partner, one town, one module) — a proposal, not a claimed partnership.

## Judging map (official criteria, in their order)
- Health impact and clinical relevance → urgency sort + red-flag routing + screening-vs-diagnosis boundary + profiler/scheduler closing the prevention loop.
- Technical depth and architecture → deterministic explainable engine, local-first architecture, combination rules, transparent weighted profiler with per-factor audit.
- Working solution and demonstration quality → live triage + handoff, scripted RED/AMBER/refusal cases, three synthetic Prevent personas end-to-end.
- Responsible AI, safety and data governance → refusal path, consent gate, no data leaves the device, limitations doc on the product itself.
- Scalability and deployment readiness → stateless front end, no server dependency.
- Commercial viability and path to pilot → one-clinic pilot proposal (see §11).

## Still needed (parent — before 20 Nov)
1. **GitHub repo** `MSAbhishek22/opd-triage-lens` + push (manifest at `~/workspace/hackathons/opd-triage-lens-paths`).
2. **Vercel deploy** (static, no build, no env vars) + public verify + Deployment Protection OFF.
3. **Demo video from the LIVE URL** (60–120 s: problem → live triage RED + AMBER + refusal → dial → handoff → Prevent: consent → Medium persona signals 53/42/28 → schedule with due dates → close).
4. **File the prototype + documentation** on Hack2Skill by Thu 20 Nov 2026 (re-submission of the 12 Nov entry, same statement #4).
5. Re-confirm the submission form fields + deadline inside the Hack2Skill dashboard at submit time.

## Do NOT claim
- Any clinical validation, any real-patient accuracy, any hospital partnership, any live deployment (until the parent verifies it), any diagnosis capability.
