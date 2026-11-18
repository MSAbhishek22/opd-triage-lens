// OPD Triage Lens — test suite (Node assertions, no dependencies)
// Run: node tests/test.js        (or: npm test)
// Exit 0 = all pass. Every failure prints the case and the verdicts.
'use strict';

const assert = require('node:assert');
const engine = require('../engine.js');
const corpus = require('../corpus.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (e) {
    failed += 1;
    failures.push({ name: name, error: e.message });
    console.error('FAIL: ' + name + '\n  ' + e.message);
  }
}

// ---------------------------------------------------------------------------
// 1. Corpus integrity
// ---------------------------------------------------------------------------
test('corpus: 34 entries, 4 colours used, every entry has keywords + advice', () => {
  assert.strictEqual(corpus.ENTRIES.length, 34, 'expected 34 entries, got ' + corpus.ENTRIES.length);
  const colours = new Set(corpus.ENTRIES.map((e) => e.colour));
  assert.deepStrictEqual([...colours].sort(), ['AMBER', 'BLUE', 'GREEN', 'RED']);
  corpus.ENTRIES.forEach((e) => {
    assert.ok(e.id && e.label && e.advice, 'entry ' + e.id + ' missing id/label/advice');
    assert.ok(Array.isArray(e.keywords) && e.keywords.length >= 2, 'entry ' + e.id + ' needs >= 2 keywords');
    assert.ok(['RED', 'AMBER', 'GREEN', 'BLUE'].includes(e.colour), 'entry ' + e.id + ' bad colour');
  });
});

test('corpus: 45 labelled cases covering all 5 outcomes', () => {
  assert.strictEqual(corpus.LABELLED_CASES.length, 45);
  const counts = {};
  corpus.LABELLED_CASES.forEach((c) => { counts[c.expected] = (counts[c.expected] || 0) + 1; });
  assert.deepStrictEqual(counts, { RED: 10, AMBER: 15, GREEN: 10, BLUE: 5, UNKNOWN: 5 });
});

test('corpus: no duplicate entry ids', () => {
  const ids = corpus.ENTRIES.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('corpus: every combination references real entry ids', () => {
  const ids = new Set(corpus.ENTRIES.map((e) => e.id));
  corpus.COMBINATIONS.forEach((r) => {
    r.needs.forEach((id) => assert.ok(ids.has(id), 'combination ' + r.id + ' references missing entry ' + id));
  });
});

// ---------------------------------------------------------------------------
// 2. Labelled-corpus accuracy — the headline measurement
// ---------------------------------------------------------------------------
test('engine: labelled-corpus accuracy is 100% (45/45)', () => {
  const m = engine.measureAccuracy();
  assert.strictEqual(m.total, 45);
  assert.strictEqual(m.correct, 45, 'misses: ' + JSON.stringify(m.misses));
  assert.strictEqual(m.accuracy, 100);
  assert.deepStrictEqual(m.misses, []);
});

test('engine: per-colour accuracy is 100% in every colour', () => {
  const m = engine.measureAccuracy();
  Object.keys(m.perColour).forEach((c) => {
    assert.strictEqual(m.perColour[c].correct, m.perColour[c].total, 'colour ' + c + ' has misses');
  });
});

// ---------------------------------------------------------------------------
// 3. Individual triage outcomes (spot checks beyond the labelled set)
// ---------------------------------------------------------------------------
test('engine: chest pain alone is AMBER, chest pain + sweating is RED', () => {
  assert.strictEqual(engine.triage('chest pain').colour, 'AMBER');
  assert.strictEqual(engine.triage('chest pain with sweating').colour, 'RED');
  assert.strictEqual(engine.triage('seene me dard, saans phoolna').colour, 'RED');
});

test('engine: exertion breathlessness is AMBER, not RED', () => {
  const r = engine.triage('chalne pe saans phoolna');
  assert.strictEqual(r.colour, 'AMBER');
  assert.strictEqual(r.entry.id, 'breathless-exertion');
});

test('engine: fever + stiff neck is RED via the combination rule', () => {
  const r = engine.triage('bukhar hai aur gardan akdi hui hai');
  assert.strictEqual(r.colour, 'RED');
  assert.ok(r.notes.some((n) => n.indexOf('stiff neck') !== -1));
});

test('engine: duration modifier — fever 2 days GREEN, 4 days AMBER', () => {
  assert.strictEqual(engine.triage('bukhar 2 din se hai').colour, 'GREEN');
  const r = engine.triage('bukhar 4 din se hai');
  assert.strictEqual(r.colour, 'AMBER');
  assert.ok(r.escalations.length > 0);
});

test('engine: child with fever is minimum AMBER', () => {
  const r = engine.triage('bukhar hai', { ageGroup: 'child' });
  assert.strictEqual(r.colour, 'AMBER');
  const adult = engine.triage('bukhar hai', { ageGroup: 'adult' });
  assert.strictEqual(adult.colour, 'GREEN');
});

test('engine: pregnant with abdominal pain is minimum AMBER', () => {
  const r = engine.triage('pet me tez dard', { ageGroup: 'pregnant' });
  assert.strictEqual(r.colour, 'AMBER');
});

test('engine: low SpO2 raises the floor to AMBER and is noted', () => {
  const r = engine.triage('khansi hai', { vitals: { spo2: 90 } });
  assert.strictEqual(r.colour, 'AMBER');
  assert.ok(r.notes.some((n) => n.indexOf('SpO2') !== -1));
});

test('engine: unknown symptoms get an honest refusal, never a guessed colour', () => {
  ['mere baal jhad rahe hain', 'I feel strange', 'dard', ''].forEach((t) => {
    const r = engine.triage(t);
    assert.strictEqual(r.colour, 'UNKNOWN', 'input "' + t + '" got ' + r.colour);
    assert.ok(r.advice.indexOf('clinician') !== -1 || r.advice.indexOf('symptoms') !== -1);
  });
});

test('engine: confidence bands — strong match HIGH, single keyword LOW', () => {
  assert.strictEqual(engine.triage('face tedha ho gaya, bolne me dikkat').confidence, 'HIGH');
  assert.strictEqual(engine.triage('vaccine lagwana hai').confidence, 'LOW');
  assert.strictEqual(engine.triage('khansi aur sardi hai').confidence, 'MEDIUM');
});

test('engine: red-flag entries are listed explicitly', () => {
  const r = engine.triage('behosh ho gaya');
  assert.strictEqual(r.colour, 'RED');
  assert.ok(r.redFlags.length > 0);
  assert.ok(r.redFlags[0].indexOf('Unconscious') !== -1);
});

test('engine: result carries matched rule, keywords and slot advice', () => {
  const r = engine.triage('daant me dard hai', { load: 'heavy' });
  assert.strictEqual(r.colour, 'AMBER');
  assert.strictEqual(r.entry.id, 'tooth-pain');
  assert.ok(r.matched.length > 0);
  assert.ok(r.slot.length > 10);
  assert.ok(r.advice.length > 10);
});

test('engine: RED slot advice always says emergency / 108, any load', () => {
  ['light', 'moderate', 'heavy'].forEach((load) => {
    const r = engine.triage('saans nahi aa rahi', { load: load });
    assert.ok(r.slot.indexOf('108') !== -1, 'load ' + load + ' missing 108');
  });
});

test('engine: slot advice changes with OPD load for GREEN', () => {
  const light = engine.triage('sir dard hai', { load: 'light' }).slot;
  const heavy = engine.triage('sir dard hai', { load: 'heavy' }).slot;
  assert.notStrictEqual(light, heavy);
  assert.ok(heavy.indexOf('2–3 days') !== -1);
});

// ---------------------------------------------------------------------------
// 4. Handoff generation
// ---------------------------------------------------------------------------
test('handoff: markdown contains verdict, rule, vitals, slot and disclaimer', () => {
  const r = engine.triage('pet me tez dard', { ageGroup: 'adult' });
  const md = engine.buildHandoff(r, {
    patient: 'Demo Patient',
    ageGroup: 'adult',
    vitals: { tempF: 101, pulse: 88, bp: '120/80', spo2: 98 }
  });
  assert.ok(md.indexOf('AMBER') !== -1);
  assert.ok(md.indexOf('Severe stomach') !== -1);
  assert.ok(md.indexOf('101') !== -1);
  assert.ok(md.indexOf('120/80') !== -1);
  assert.ok(md.indexOf('98%') !== -1);
  assert.ok(md.indexOf('does NOT diagnose') !== -1);
  assert.ok(md.indexOf('pet me tez dard') !== -1);
});

test('handoff: UNKNOWN verdict still produces a safe handoff', () => {
  const r = engine.triage('mere baal jhad rahe hain');
  const md = engine.buildHandoff(r, {});
  assert.ok(md.indexOf('UNKNOWN') !== -1);
  assert.ok(md.indexOf('could not triage') !== -1);
});

// ---------------------------------------------------------------------------
// 5. Normalisation / parsing helpers
// ---------------------------------------------------------------------------
test('normalize: punctuation and case do not change the verdict', () => {
  assert.strictEqual(engine.triage('BUKHAR!!! 2 din se...').colour, 'GREEN');
  assert.strictEqual(engine.triage('  Chest Pain  ').colour, 'AMBER');
});

test('parseDays: numeric and word durations', () => {
  assert.strictEqual(engine.parseDays('bukhar 4 din se'), 4);
  assert.strictEqual(engine.parseDays('since 3 days'), 3);
  assert.strictEqual(engine.parseDays('hafte bhar se khansi'), 7);
  assert.strictEqual(engine.parseDays('bukhar hai'), 0);
});

// ---------------------------------------------------------------------------
// 6. Prevent mode — profiler (prevent.js, added 18 Nov 2026)
// ---------------------------------------------------------------------------
const prevent = require('../prevent.js');

test('prevent: score bands — 34 Lower, 35 Review, 64 Review, 65 Strong', () => {
  assert.strictEqual(prevent.levelForScore(0).key, 'lower');
  assert.strictEqual(prevent.levelForScore(34).key, 'lower');
  assert.strictEqual(prevent.levelForScore(35).key, 'review');
  assert.strictEqual(prevent.levelForScore(64).key, 'review');
  assert.strictEqual(prevent.levelForScore(65).key, 'strong');
  assert.strictEqual(prevent.levelForScore(100).key, 'strong');
});

test('prevent: consent gate — Continue only when both boxes are checked', () => {
  assert.strictEqual(prevent.canContinue(true, true), true);
  assert.strictEqual(prevent.canContinue(true, false), false);
  assert.strictEqual(prevent.canContinue(false, true), false);
  assert.strictEqual(prevent.canContinue(false, false), false);
});

test('prevent: low persona — every module 0, worst Lower, not urgent', () => {
  const r = prevent.computeSignals(prevent.PERSONAS.low);
  assert.deepStrictEqual(r.modules.map((m) => m.score), [0, 0, 0]);
  assert.deepStrictEqual(r.modules.map((m) => m.level.key), ['lower', 'lower', 'lower']);
  assert.strictEqual(r.worst, 'lower');
  assert.strictEqual(r.urgent, false);
});

test('prevent: medium persona — metabolic 53, cardio 42 (Review), sleep 28 (Lower)', () => {
  const r = prevent.computeSignals(prevent.PERSONAS.medium);
  assert.deepStrictEqual(r.modules.map((m) => m.score), [53, 42, 28]);
  assert.deepStrictEqual(r.modules.map((m) => m.level.key), ['review', 'review', 'lower']);
  assert.strictEqual(r.worst, 'review');
  assert.strictEqual(r.urgent, false);
});

test('prevent: red-flag persona — metabolic + cardio capped at 100 (Strong), sleep 64, urgent', () => {
  const r = prevent.computeSignals(prevent.PERSONAS.redflag);
  assert.deepStrictEqual(r.modules.map((m) => m.score), [100, 100, 64]);
  assert.deepStrictEqual(r.modules.map((m) => m.level.key), ['strong', 'strong', 'review']);
  assert.strictEqual(r.worst, 'strong');
  assert.strictEqual(r.urgent, true);
});

test('prevent: contributions name the exact inputs that moved the score', () => {
  const r = prevent.computeSignals(prevent.PERSONAS.medium);
  const metabolic = r.modules[0].contributions;
  assert.strictEqual(metabolic.length, 5);
  assert.ok(metabolic.some((c) => c.label === 'Age band 45–59' && c.points === 10));
  assert.ok(metabolic.some((c) => c.label === 'Family history — diabetes' && c.points === 10));
  assert.ok(metabolic.some((c) => c.label === 'Low physical activity' && c.points === 15));
  assert.strictEqual(r.modules[0].contributions.reduce((s, c) => s + c.points, 0), 53);
});

test('prevent: family history stays in its own module — diabetes metabolic only, heart cardio only', () => {
  const base = { ageBand: '30-44', activity: 'high', smoking: 'never', sleep: '7-9',
    stress: 'low', diet: 'plant', sitting: 'lt4', bp: 'normal', sugar: 'normal',
    bmi: 'lt25', chol: 'normal', urgentNow: false };
  const withDiabetes = prevent.computeSignals(Object.assign({}, base, { familyHistory: 'diabetes' }));
  assert.strictEqual(withDiabetes.modules[0].score, 10);
  assert.strictEqual(withDiabetes.modules[1].score, 0);
  const withHeart = prevent.computeSignals(Object.assign({}, base, { familyHistory: 'heart' }));
  assert.strictEqual(withHeart.modules[0].score, 0);
  assert.strictEqual(withHeart.modules[1].score, 12);
});

test('prevent: empty inputs score 0 everywhere and list no contributors', () => {
  const r = prevent.computeSignals({});
  assert.deepStrictEqual(r.modules.map((m) => m.score), [0, 0, 0]);
  r.modules.forEach((m) => assert.strictEqual(m.contributions.length, 0));
  assert.strictEqual(r.worst, 'lower');
  assert.strictEqual(r.urgent, false);
});

test('prevent: urgent screen comes only from the checkbox, never from a score', () => {
  const strongNoUrgent = prevent.computeSignals(prevent.PERSONAS.redflag);
  strongNoUrgent.urgent = false;
  const noUrgent = prevent.computeSignals(Object.assign({}, prevent.PERSONAS.redflag, { urgentNow: false }));
  assert.strictEqual(noUrgent.urgent, false);
  assert.strictEqual(noUrgent.worst, 'strong');
  const lowUrgent = prevent.computeSignals(Object.assign({}, prevent.PERSONAS.low, { urgentNow: true }));
  assert.strictEqual(lowUrgent.urgent, true);
  assert.strictEqual(lowUrgent.worst, 'lower');
});

// ---------------------------------------------------------------------------
// 7. Prevent mode — scheduler + next step + summary
// ---------------------------------------------------------------------------
test('prevent: scheduler intervals follow the worst band (bp check 24 / 12 / 6 months)', () => {
  const assessed = new Date(2026, 10, 18); // 18 Nov 2026
  const lower = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.low), assessed);
  const review = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.medium), assessed);
  // Red-flag persona has the urgent box ticked, which defers the schedule —
  // use the same inputs without the urgent box for the Strong-band schedule.
  const strong = prevent.buildSchedule(
    prevent.computeSignals(Object.assign({}, prevent.PERSONAS.redflag, { urgentNow: false })), assessed);
  assert.strictEqual(lower.deferred, false);
  assert.strictEqual(lower.items.length, 7);
  const bp = (s) => s.items.find((i) => i.id === 'bp-check');
  assert.strictEqual(bp(lower).months, 24);
  assert.strictEqual(bp(review).months, 12);
  assert.strictEqual(bp(strong).months, 6);
  assert.strictEqual(bp(lower).dueLabel, 'Nov 2028');
  assert.strictEqual(bp(review).dueLabel, 'Nov 2027');
  assert.strictEqual(bp(strong).dueLabel, 'May 2027');
  assert.strictEqual(bp(lower).intervalLabel, 'every 2 years');
  assert.strictEqual(bp(review).intervalLabel, 'annual');
  assert.strictEqual(bp(strong).intervalLabel, 'every 6 months');
});

test('prevent: scheduler links items to the inputs that moved the score', () => {
  const assessed = new Date(2026, 10, 18);
  const s = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.medium), assessed);
  const bp = s.items.find((i) => i.id === 'bp-check');
  assert.strictEqual(bp.linked, true); // medium persona has elevated BP
  const sugar = s.items.find((i) => i.id === 'sugar-check');
  assert.strictEqual(sugar.linked, false); // medium persona sugar is normal
  const low = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.low), assessed);
  low.items.forEach((i) => assert.strictEqual(i.linked, false));
});

test('prevent: scheduler pathways follow the band; urgent defers the whole schedule', () => {
  const assessed = new Date(2026, 10, 18);
  const lower = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.low), assessed);
  const review = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.medium), assessed);
  const strong = prevent.buildSchedule(prevent.computeSignals(Object.assign({}, prevent.PERSONAS.redflag, { urgentNow: false })), assessed);
  assert.ok(lower.items[0].pathway.indexOf('Self-care') !== -1);
  assert.ok(review.items[0].pathway.indexOf('Primary-care navigation') !== -1);
  assert.ok(strong.items[0].pathway.indexOf('promptly') !== -1);
  const urgent = prevent.buildSchedule(prevent.computeSignals(prevent.PERSONAS.redflag), assessed);
  assert.strictEqual(urgent.deferred, true);
  assert.deepStrictEqual(urgent.items, []);
  assert.strictEqual(urgent.nextStep.key, 'urgent');
});

test('prevent: time to next step — lower none, review 4 weeks, strong 1 week, urgent now', () => {
  const low = prevent.nextStepFor(prevent.computeSignals(prevent.PERSONAS.low));
  const review = prevent.nextStepFor(prevent.computeSignals(prevent.PERSONAS.medium));
  const strong = prevent.nextStepFor(prevent.computeSignals(Object.assign({}, prevent.PERSONAS.redflag, { urgentNow: false })));
  const urgent = prevent.nextStepFor(prevent.computeSignals(prevent.PERSONAS.redflag));
  assert.strictEqual(low.within, 'No appointment implied');
  assert.strictEqual(review.within, 'Within 4 weeks');
  assert.strictEqual(strong.within, 'Within 1 week');
  assert.strictEqual(urgent.within, 'Now');
});

test('prevent: summary carries the screening boundary, scores, schedule and due dates', () => {
  const assessed = new Date(2026, 10, 18);
  const res = prevent.computeSignals(prevent.PERSONAS.medium);
  const sched = prevent.buildSchedule(res, assessed);
  const md = prevent.buildPreventSummary(res, prevent.PERSONAS.medium, sched);
  assert.ok(md.indexOf('not a diagnosis') !== -1);
  assert.ok(md.indexOf('Review') !== -1);
  assert.ok(md.indexOf('53/100') !== -1);
  assert.ok(md.indexOf('Blood pressure check') !== -1);
  assert.ok(md.indexOf('Nov 2027') !== -1);
  assert.ok(md.indexOf('Within 4 weeks') !== -1);
  assert.ok(md.indexOf('Family history') !== -1);
});

test('prevent: next-step guidance is distinct per band and never diagnoses', () => {
  const urgent = prevent.buildTriageHtml(prevent.computeSignals(prevent.PERSONAS.redflag));
  assert.ok(urgent.indexOf('Urgent') !== -1);
  assert.ok(urgent.indexOf('emergency number') !== -1);
  const lower = prevent.buildTriageHtml(prevent.computeSignals(prevent.PERSONAS.low));
  assert.ok(lower.indexOf('self-care') !== -1);
  assert.ok(lower.indexOf('not a diagnosis') !== -1);
  const review = prevent.buildTriageHtml(prevent.computeSignals(prevent.PERSONAS.medium));
  assert.ok(review.indexOf('primary-care') !== -1);
});

test('prevent: empty-state wording separates "nothing entered" from "entered, no points"', () => {
  const none = prevent.emptyStateText('metabolic', {});
  assert.ok(none.indexOf('No inputs were provided') !== -1);
  const entered = prevent.emptyStateText('metabolic', prevent.PERSONAS.low);
  assert.ok(entered.indexOf('No contributing risk factors') !== -1);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\nOPD Triage Lens — test results');
console.log('  passed: ' + passed);
console.log('  failed: ' + failed);
const acc = engine.measureAccuracy();
console.log('  labelled-corpus accuracy: ' + acc.correct + '/' + acc.total + ' = ' + acc.accuracy + '%');
console.log('  per-colour: ' + Object.keys(acc.perColour).map((c) => c + ' ' + acc.perColour[c].correct + '/' + acc.perColour[c].total).join(', '));
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
  process.exit(1);
} else {
  console.log('  ALL TESTS PASS');
}
