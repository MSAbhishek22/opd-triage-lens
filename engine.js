// OPD Triage Lens — deterministic triage engine (v1.0, 12 Nov 2026)
// ---------------------------------------------------------------------------
// No model, no API, no randomness. Every verdict is produced by:
//   1. keyword/phrase matching against the labelled corpus,
//   2. explicit combination rules (the "doctor's second look"),
//   3. explicit modifiers (duration, age group, vitals),
//   4. capacity-aware slot advice.
// Tie-break order: score -> keyword coverage -> colour severity -> entry order.
// Severity is NOT escalated by generic words ("tez", "severe") — those words
// are already baked into the AMBER keywords themselves, and a generic rule
// would wrongly push "pet me tez dard" to RED. Severity lives in the corpus,
// not in a free-text guess.

(function (root, factory) {
  var DATA = (typeof require !== 'undefined')
    ? require('./corpus.js')
    : root.OPD_TRIAGE_CORPUS;

  var ORDER = ['BLUE', 'GREEN', 'AMBER', 'RED']; // least -> most severe

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escalate(colour) {
    var i = ORDER.indexOf(colour);
    return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : colour;
  }

  function atLeast(colour, minimum) {
    return ORDER.indexOf(colour) >= ORDER.indexOf(minimum) ? colour : minimum;
  }

  // Match one corpus entry against normalised text.
  // Phrase keywords (contain a space) score 2; single tokens score 1.
  function matchEntry(text, entry) {
    var padded = ' ' + text + ' ';
    var tokens = {};
    text.split(' ').forEach(function (t) { if (t) tokens[t] = true; });
    var score = 0;
    var matched = [];
    entry.keywords.forEach(function (kw) {
      if (kw.indexOf(' ') !== -1) {
        if (padded.indexOf(' ' + kw + ' ') !== -1) { score += 2; matched.push(kw); }
      } else if (tokens[kw]) {
        score += 1; matched.push(kw);
      }
    });
    return {
      entry: entry,
      score: score,
      matched: matched,
      coverage: entry.keywords.length ? matched.length / entry.keywords.length : 0
    };
  }

  // Parse a duration in days: "4 din se", "since 3 days", "hafte bhar" (=7).
  function parseDays(text) {
    var m = text.match(/(\d+)\s*(din|day|days)/);
    if (m) return parseInt(m[1], 10);
    if (/\bhafte\b/.test(text)) return 7;
    if (/\bmahine\b/.test(text)) return 30;
    return 0;
  }

  function slotAdvice(colour, load) {
    var L = load || 'moderate';
    if (colour === 'RED') {
      return 'Emergency NOW — go to the nearest emergency department or call 108. Do not wait for an OPD slot.';
    }
    if (colour === 'AMBER') {
      if (L === 'light') return 'Same-day OPD slot — walk in now and ask for the urgent queue.';
      if (L === 'heavy') return 'OPD is crowded today — join the urgent queue at the OPD desk first thing in the morning. If symptoms worsen, go to emergency.';
      return 'Same-day OPD slot — expect a 1–2 hour wait; try to reach before 2 pm.';
    }
    if (colour === 'GREEN') {
      if (L === 'light') return 'Next available slot today.';
      if (L === 'heavy') return 'Next available slot in 2–3 days, or a teleconsult today if the hospital offers one.';
      return 'Tomorrow\u2019s first OPD slot.';
    }
    if (colour === 'BLUE') {
      if (L === 'heavy') return 'No urgent slot needed — book a routine checkup at your convenience. OPD is crowded today, so pick a lighter day if you can.';
      return 'No urgent slot needed — book a routine checkup at your convenience.';
    }
    return 'No slot advice — the symptoms could not be triaged. See a clinician in person.';
  }

  // Main entry point. opts: { ageGroup, load, vitals: { tempF, spo2, pulse } }
  function triage(input, opts) {
    opts = opts || {};
    var ageGroup = opts.ageGroup || 'adult';
    var load = opts.load || 'moderate';
    var vitals = opts.vitals || {};
    var raw = (input || '').trim();
    var text = normalize(raw);
    var notes = [];
    var escalations = [];

    if (!text) {
      return {
        input: raw, colour: 'UNKNOWN', entry: null, matched: [], score: 0,
        confidence: 'NONE', redFlags: [], notes: ['No symptoms entered.'],
        escalations: [], slot: slotAdvice('UNKNOWN', load),
        advice: 'Describe your symptoms in a sentence — for example "bukhar 2 din se" or "chest pain".'
      };
    }

    var matches = DATA.ENTRIES.map(function (e) { return matchEntry(text, e); })
      .filter(function (m) { return m.score > 0; });

    if (matches.length === 0) {
      return {
        input: raw, colour: 'UNKNOWN', entry: null, matched: [], score: 0,
        confidence: 'NONE', redFlags: [], notes: ['No rule in the corpus matches these symptoms.'],
        escalations: [], slot: slotAdvice('UNKNOWN', load),
        advice: 'These symptoms are not in our triage corpus. Do not guess — see a clinician in person and describe exactly what you feel.'
      };
    }

    matches.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      var ra = DATA.COLOURS[a.entry.colour].rank;
      var rb = DATA.COLOURS[b.entry.colour].rank;
      if (rb !== ra) return rb - ra;
      return DATA.ENTRIES.indexOf(a.entry) - DATA.ENTRIES.indexOf(b.entry);
    });

    var best = matches[0];
    var colour = best.entry.colour;
    var redFlags = [];

    // 1) Red-flag entries force RED — but ONLY when the red-flag entry is
    // the winning entry. A red-flag entry that merely shares a keyword
    // (e.g. "chest pain" inside the breathlessness entry) must not force
    // RED on its own; the combination rules cover those cases.
    var redFlags = [];
    if (best.entry.redFlag) {
      redFlags.push(best.entry.label);
      colour = 'RED';
      notes.push('Red-flag symptom detected: ' + best.entry.label + '.');
    }

    // 2) Combination rules — evaluated on matched entry ids (+ keywords
    //    where the rule demands them; see corpus.js).
    var matchedIds = {};
    var matchedKeywords = {};
    matches.forEach(function (m) {
      matchedIds[m.entry.id] = true;
      m.matched.forEach(function (kw) { matchedKeywords[kw] = true; });
    });
    var comboNotes = [];
    DATA.COMBINATIONS.forEach(function (rule) {
      var all = rule.needs.every(function (id) { return matchedIds[id]; });
      if (all && rule.needsKeywords) {
        all = rule.needsKeywords.some(function (kw) { return matchedKeywords[kw]; });
      }
      if (all) {
        colour = atLeast(colour, rule.force);
        comboNotes.push(rule.note);
      }
    });
    if (comboNotes.length > 0) notes = notes.concat(comboNotes);

    // 3) Duration modifier: fever / cold-cough for 3+ days escalates one step.
    var days = parseDays(text);
    if (days >= 3 && DATA.DURATION_ESCALATE_IDS.indexOf(best.entry.id) !== -1) {
      var before = colour;
      colour = escalate(colour);
      if (colour !== before) {
        escalations.push('Lasting ' + days + ' days — escalated one step (' + before + ' \u2192 ' + colour + ').');
      }
    }

    // 4) Age-group modifiers (explicit, documented).
    if (ageGroup === 'child' && (best.entry.id === 'fever' || best.entry.id === 'high-fever')) {
      var c0 = colour;
      colour = atLeast(colour, 'AMBER');
      if (colour !== c0) escalations.push('Child with fever — minimum AMBER (children are seen same-day).');
    }
    if (ageGroup === 'pregnant' && ['severe-bleeding', 'severe-abdominal', 'fever', 'high-fever', 'blood-stool'].indexOf(best.entry.id) !== -1) {
      var c1 = colour;
      colour = atLeast(colour, 'AMBER');
      if (colour !== c1) escalations.push('Pregnancy + this symptom — minimum AMBER.');
    }
    if (ageGroup === 'elderly' && colour === 'AMBER') {
      notes.push('Elderly patient — ask the OPD desk for the priority queue.');
    }

    // 5) Vitals (optional, user-entered). Out-of-range vitals raise the floor.
    if (vitals.spo2 && Number(vitals.spo2) < 92) {
      var c2 = colour;
      colour = atLeast(colour, 'AMBER');
      notes.push('SpO2 ' + vitals.spo2 + '% is below 92% — mention this first at the desk.');
      if (colour !== c2) escalations.push('Low SpO2 — minimum AMBER.');
    }
    if (vitals.tempF && Number(vitals.tempF) >= 104) {
      var c3 = colour;
      colour = atLeast(colour, 'AMBER');
      notes.push('Temperature ' + vitals.tempF + '\u00B0F is very high — mention this first at the desk.');
      if (colour !== c3) escalations.push('Very high temperature — minimum AMBER.');
    }
    if (vitals.pulse && Number(vitals.pulse) > 120) {
      notes.push('Pulse ' + vitals.pulse + ' bpm is high — mention this first at the desk.');
    }

    // Confidence: HIGH on a red flag / combination or a strong match,
    // MEDIUM on two points, LOW on a single point.
    var confidence = 'LOW';
    if (redFlags.length > 0 || comboNotes.length > 0 || best.score >= 4) confidence = 'HIGH';
    else if (best.score >= 2) confidence = 'MEDIUM';

    // Advice comes from the winning entry; a forced RED overrides it.
    var advice = best.entry.advice;
    if (colour === 'RED' && !best.entry.redFlag) {
      advice = 'Escalated to emergency by a combination rule — see the notes. Go to emergency now or call 108.';
    }

    return {
      input: raw,
      colour: colour,
      entry: { id: best.entry.id, label: best.entry.label, colour: best.entry.colour },
      matched: best.matched,
      allMatches: matches.slice(0, 3).map(function (m) {
        return { id: m.entry.id, label: m.entry.label, colour: m.entry.colour, score: m.score };
      }),
      score: best.score,
      confidence: confidence,
      redFlags: redFlags,
      notes: notes,
      escalations: escalations,
      days: days,
      slot: slotAdvice(colour, load),
      advice: advice
    };
  }

  // Accuracy on our own labelled test set (not real patient data).
  function measureAccuracy() {
    var perColour = {};
    var misses = [];
    var correct = 0;
    DATA.LABELLED_CASES.forEach(function (c) {
      var r = triage(c.text, { ageGroup: c.ageGroup || 'adult' });
      var key = c.expected;
      perColour[key] = perColour[key] || { total: 0, correct: 0 };
      perColour[key].total += 1;
      if (r.colour === c.expected) {
        correct += 1;
        perColour[key].correct += 1;
      } else {
        misses.push({ text: c.text, expected: c.expected, got: r.colour, entry: r.entry && r.entry.id });
      }
    });
    var total = DATA.LABELLED_CASES.length;
    return {
      total: total,
      correct: correct,
      accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
      perColour: perColour,
      misses: misses
    };
  }

  // Structured doctor handoff, as Markdown text (copy / print / download).
  function buildHandoff(result, opts) {
    opts = opts || {};
    var v = opts.vitals || {};
    var lines = [];
    lines.push('# OPD Handoff — Triage Lens');
    lines.push('');
    lines.push('**Generated:** ' + new Date().toLocaleString('en-IN'));
    lines.push('**Patient (as entered):** ' + (opts.patient || '—'));
    lines.push('**Age group:** ' + (opts.ageGroup || 'adult'));
    lines.push('');
    lines.push('## What the patient said');
    lines.push('> ' + (result.input || '—'));
    lines.push('');
    lines.push('## Triage verdict');
    lines.push('- **Colour:** ' + result.colour + ' (' + (DATA.COLOURS[result.colour] ? DATA.COLOURS[result.colour].label : '') + ')');
    lines.push('- **Confidence:** ' + result.confidence);
    lines.push('- **Matched rule:** ' + (result.entry ? result.entry.label + ' (' + result.entry.id + ')' : 'none — could not triage'));
    lines.push('- **Matched keywords:** ' + (result.matched.length ? result.matched.join(', ') : 'none'));
    if (result.redFlags.length) lines.push('- **Red flags:** ' + result.redFlags.join('; '));
    if (result.escalations.length) result.escalations.forEach(function (e) { lines.push('- **Escalation:** ' + e); });
    if (result.notes.length) result.notes.forEach(function (n) { lines.push('- **Note:** ' + n); });
    lines.push('');
    if (v.tempF || v.pulse || v.bp || v.spo2) {
      lines.push('## Vitals (patient-entered)');
      if (v.tempF) lines.push('- Temperature: ' + v.tempF + ' °F');
      if (v.pulse) lines.push('- Pulse: ' + v.pulse + ' bpm');
      if (v.bp) lines.push('- Blood pressure: ' + v.bp + ' mmHg');
      if (v.spo2) lines.push('- SpO2: ' + v.spo2 + '%');
      lines.push('');
    }
    lines.push('## Slot advice');
    lines.push(result.slot);
    lines.push('');
    lines.push('## Doctor\'s advice (from the matched rule)');
    lines.push(result.advice);
    lines.push('');
    lines.push('---');
    lines.push('*OPD Triage Lens is a decision-support tool for OPD flow. It triages urgency — it does NOT diagnose. Verify everything clinically.*');
    return lines.join('\n');
  }

  var API = {
    COLOURS: DATA.COLOURS,
    ENTRIES: DATA.ENTRIES,
    COMBINATIONS: DATA.COMBINATIONS,
    LABELLED_CASES: DATA.LABELLED_CASES,
    normalize: normalize,
    triage: triage,
    measureAccuracy: measureAccuracy,
    buildHandoff: buildHandoff,
    slotAdvice: slotAdvice,
    parseDays: parseDays
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else {
    root.OPD_TRIAGE = API;
  }
})(typeof self !== 'undefined' ? self : this, null);
