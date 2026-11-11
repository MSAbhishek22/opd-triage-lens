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
