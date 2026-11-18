// OPD Triage Lens — Prevent mode engine (v1.1, 18 Nov 2026)
// ---------------------------------------------------------------------------
// The preventive half of OPD Triage Lens: an interactive personal health
// risk profiler + preventive screening scheduler, built to answer the
// reviewer feedback of 17 Nov 2026 ("feels more like a static application").
//
// Same rules as the triage engine: no model, no API, no randomness, no
// server. A transparent rule-based weighted score shows WHICH inputs moved
// each signal and why. Every result states "This is screening, not a
// diagnosis" — the score stratifies a prompt to talk to a clinician, it
// never identifies a disease or condition.
//
// Scoring model (adapted from the 3 Nov "Preventive Signal Front Door"
// draft in ~/workspace/hackathons/future-health/app/, extended here with a
// family-history factor the reviewers explicitly asked for):
//   - Three modules: metabolic-lifestyle, cardiovascular-lifestyle,
//     sleep/stress wellbeing. Each rule is (input, value, points, label).
//   - Thresholds: <35 Lower, 35-64 Review, >=65 Strong. Scores cap at 100.
//   - The urgent screen comes ONLY from the "worrying symptoms right now"
//     checkbox — never from a score. A score can prompt a clinician visit;
//     it can never declare an emergency.
//   - Unknown / not-provided values add 0 and are never listed as
//     contributors. Family history is asked in broad categories only
//     (diabetes / heart disease in parents or siblings), never in detail.

(function (root, factory) {
  'use strict';

  var INPUT_IDS = ['ageBand', 'familyHistory', 'activity', 'smoking', 'sleep',
    'stress', 'diet', 'sitting', 'bp', 'sugar', 'bmi', 'chol'];

  var MODULES = [
    { id: 'metabolic', name: 'Metabolic-lifestyle signal',
      rules: [
        ['ageBand', '45-59', 10, 'Age band 45–59'], ['ageBand', '60+', 18, 'Age band 60+'],
        ['familyHistory', 'diabetes', 10, 'Family history — diabetes'],
        ['familyHistory', 'both', 12, 'Family history — diabetes and heart disease'],
        ['activity', 'low', 15, 'Low physical activity'],
        ['diet', 'processed', 12, 'Mostly processed diet'],
        ['sitting', 'gt8', 8, 'Sitting more than 8 hours a day'],
        ['bmi', '25-30', 12, 'Weight band BMI 25–30'], ['bmi', 'gt30', 20, 'Weight band BMI over 30'],
        ['sugar', 'elevated', 18, 'Blood sugar elevated (as reported)'],
        ['bp', 'elevated', 6, 'Blood pressure elevated (as reported)'],
        ['bp', 'high', 10, 'Blood pressure high (as reported)'],
        ['sleep', 'lt6', 5, 'Sleep under 6 hours']
      ] },
    { id: 'cardio', name: 'Cardiovascular-lifestyle signal',
      rules: [
        ['ageBand', '45-59', 10, 'Age band 45–59'], ['ageBand', '60+', 18, 'Age band 60+'],
        ['familyHistory', 'heart', 12, 'Family history — heart disease'],
        ['familyHistory', 'both', 14, 'Family history — diabetes and heart disease'],
        ['smoking', 'former', 10, 'Former smoker'], ['smoking', 'current', 22, 'Current smoker'],
        ['activity', 'low', 12, 'Low physical activity'],
        ['bp', 'elevated', 10, 'Blood pressure elevated (as reported)'],
        ['bp', 'high', 20, 'Blood pressure high (as reported)'],
        ['chol', 'high', 15, 'Cholesterol high (as reported)'],
        ['stress', 'high', 8, 'High stress'],
        ['sitting', 'gt8', 6, 'Sitting more than 8 hours a day'],
        ['bmi', 'gt30', 8, 'Weight band BMI over 30']
      ] },
    { id: 'sleep', name: 'Sleep / stress wellbeing signal',
      rules: [
        ['sleep', 'lt6', 22, 'Sleep under 6 hours'], ['sleep', '6-7', 10, 'Sleep 6–7 hours'],
        ['sleep', 'gt9', 8, 'Sleep over 9 hours'],
        ['stress', 'high', 22, 'High stress'], ['stress', 'mod', 10, 'Moderate stress'],
        ['activity', 'low', 8, 'Low physical activity'],
        ['sitting', 'gt8', 6, 'Sitting more than 8 hours a day'],
        ['smoking', 'current', 6, 'Current smoker']
      ] }
  ];

  function levelForScore(score) {
    if (score >= 65) return { key: 'strong', label: 'Strong signal', icon: '▲' };
    if (score >= 35) return { key: 'review', label: 'Review', icon: '●' };
    return { key: 'lower', label: 'Lower signal', icon: '○' };
  }

  function canContinue(consentScreening, consentLocal) {
    return consentScreening === true && consentLocal === true;
  }

  function computeSignals(inputs) {
    inputs = inputs || {};
    var modules = MODULES.map(function (m) {
      var score = 0;
      var contributions = [];
      m.rules.forEach(function (r) {
        if (inputs[r[0]] === r[1]) { score += r[2]; contributions.push({ label: r[3], points: r[2] }); }
      });
      if (score > 100) score = 100;
      var level = levelForScore(score);
      return { id: m.id, name: m.name, score: score, level: level, contributions: contributions };
    });
    var urgent = inputs.urgentNow === true;
    var worst = 'lower';
    modules.forEach(function (m) {
      if (m.level.key === 'strong') worst = 'strong';
      else if (m.level.key === 'review' && worst === 'lower') worst = 'review';
    });
    return { modules: modules, urgent: urgent, worst: worst };
  }

  // ---------------------------------------------------------------------------
  // Synthetic demo personas — labelled synthetic everywhere they are shown.
  // low: every module 0 (Lower). medium: metabolic 53, cardio 42 (Review),
  // sleep 28 (Lower). redflag: metabolic + cardio capped at 100 (Strong),
  // sleep 64 (Review), urgent checkbox on.
  // ---------------------------------------------------------------------------
  var PERSONAS = {
    low: { ageBand: '30-44', familyHistory: 'none', activity: 'high', smoking: 'never',
      sleep: '7-9', stress: 'low', diet: 'plant', sitting: 'lt4', bp: 'normal',
      sugar: 'normal', bmi: 'lt25', chol: 'normal', urgentNow: false },
    medium: { ageBand: '45-59', familyHistory: 'diabetes', activity: 'low', smoking: 'former',
      sleep: '6-7', stress: 'mod', diet: 'mixed', sitting: '4-8', bp: 'elevated',
      sugar: 'normal', bmi: '25-30', chol: 'normal', urgentNow: false },
    redflag: { ageBand: '60+', familyHistory: 'both', activity: 'low', smoking: 'current',
      sleep: 'lt6', stress: 'high', diet: 'processed', sitting: 'gt8', bp: 'high',
      sugar: 'elevated', bmi: 'gt30', chol: 'high', urgentNow: true }
  };

  // ---------------------------------------------------------------------------
  // Screening scheduler. Each screening has an interval in months per risk
  // band (worst band of the profile decides). Intervals are the schedule the
  // challenge asked for: annual / 2-yearly / 5-yearly by risk band, with
  // 6-monthly for the strongest band on the checks that track the inputs
  // that moved the score. Due dates count forward from the assessment date.
  // Pathways: self-care info (lower), primary-care navigation (review),
  // primary-care promptly (strong). When the urgent box is ticked the whole
  // schedule is deferred — urgent care comes first.
  // ---------------------------------------------------------------------------
  var SCREENINGS = [
    { id: 'bp-check', name: 'Blood pressure check',
      why: 'A basic preventive check of blood pressure.',
      months: { lower: 24, review: 12, strong: 6 },
      link: ['Blood pressure elevated (as reported)', 'Blood pressure high (as reported)'] },
    { id: 'sugar-check', name: 'Blood sugar check',
      why: 'A basic preventive check of blood sugar.',
      months: { lower: 60, review: 24, strong: 12 },
      link: ['Blood sugar elevated (as reported)'] },
    { id: 'chol-check', name: 'Cholesterol check',
      why: 'A basic preventive check of cholesterol.',
      months: { lower: 60, review: 24, strong: 12 },
      link: ['Cholesterol high (as reported)'] },
    { id: 'weight-review', name: 'Weight and BMI review',
      why: 'A routine review of weight band, with general activity and diet information.',
      months: { lower: 12, review: 6, strong: 6 },
      link: ['Weight band BMI 25–30', 'Weight band BMI over 30'] },
    { id: 'vision-check', name: 'Vision check',
      why: 'A routine preventive vision check.',
      months: { lower: 24, review: 24, strong: 12 },
      link: [] },
    { id: 'dental-check', name: 'Dental check',
      why: 'A routine preventive dental check.',
      months: { lower: 12, review: 12, strong: 12 },
      link: [] },
    { id: 'general-review', name: 'General preventive health review with a clinician',
      why: 'A routine conversation that covers your inputs alongside things this check does not ask about, such as medicines and family history in detail.',
      months: { lower: 24, review: 12, strong: 6 },
      link: [] }
  ];

  var PATHWAYS = {
    lower: 'Self-care information / routine booking',
    review: 'Primary-care navigation — routine booking',
    strong: 'Primary-care — contact promptly'
  };

  function monthYear(date) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function addMonths(date, n) {
    var d = new Date(date.getTime());
    d.setMonth(d.getMonth() + n);
    return d;
  }

  // Time to the appropriate next step, by worst band (and urgent first).
  function nextStepFor(result) {
    if (result.urgent) {
      return { key: 'urgent', label: 'Urgent — now', within: 'Now',
        note: 'You checked that you are experiencing worrying symptoms right now. Call your local emergency number now or go to urgent care immediately. Do not wait for a routine appointment.' };
    }
    if (result.worst === 'strong') {
      return { key: 'strong', label: 'Strong signal — promptly', within: 'Within 1 week',
        note: 'At least one signal is strong. Contact a primary-care clinician promptly to discuss your inputs — bring this page\u2019s listed factors with you.' };
    }
    if (result.worst === 'review') {
      return { key: 'review', label: 'Review — routine', within: 'Within 4 weeks',
        note: 'At least one signal is in the review range. Book a routine primary-care conversation to discuss the listed factors.' };
    }
    return { key: 'lower', label: 'Lower signal — no appointment implied', within: 'No appointment implied',
      note: 'All signals are in the lower range for the inputs you entered. No appointment is implied — but if anything worries you, talk to a clinician anyway. A lower signal does not rule anything out.' };
  }

  function buildSchedule(result, assessmentDate) {
    assessmentDate = assessmentDate || new Date();
    var nextStep = nextStepFor(result);
    if (result.urgent) {
      return { deferred: true, nextStep: nextStep, assessedOn: assessmentDate, items: [] };
    }
    var band = result.worst;
    var linkedLabels = {};
    result.modules.forEach(function (m) {
      m.contributions.forEach(function (c) { linkedLabels[c.label] = true; });
    });
    var items = SCREENINGS.map(function (s) {
      var months = s.months[band];
      var due = addMonths(assessmentDate, months);
      var linked = s.link.some(function (label) { return linkedLabels[label]; });
      var intervalLabel = months === 6 ? 'every 6 months' : months === 12 ? 'annual' : months === 24 ? 'every 2 years' : 'every 5 years';
      return {
        id: s.id, name: s.name, why: s.why,
        months: months, intervalLabel: intervalLabel,
        dueDate: due, dueLabel: monthYear(due),
        pathway: PATHWAYS[band], linked: linked
      };
    });
    return { deferred: false, nextStep: nextStep, assessedOn: assessmentDate, items: items };
  }

  // ---------------------------------------------------------------------------
  // Next-step guidance (per worst band / urgent). Same text the 3 Nov draft
  // shipped; it is our own prior work for this same challenge.
  // ---------------------------------------------------------------------------
  function buildTriageHtml(res) {
    var head;
    if (res.urgent) {
      head = '<div class="triage-urgent"><h3>● Urgent — seek urgent care now</h3>'
        + '<p>You checked that you are experiencing worrying symptoms right now. <strong>Call your local emergency number now</strong> or go to urgent care immediately.</p>'
        + '<p>This tool does not replace emergency services and cannot help in an emergency.</p></div>';
    } else if (res.worst === 'strong') {
      head = '<h3>▲ Strong signal — seek care promptly</h3>'
        + '<p>At least one signal is strong. Consider contacting a primary-care clinician promptly to discuss your inputs — bring this page\u2019s listed factors with you. This is a prompt to talk to a clinician, not a finding about any condition.</p>';
    } else if (res.worst === 'review') {
      head = '<h3>● Review — consider primary-care navigation</h3>'
        + '<p>At least one signal is in the review range. Consider booking a routine primary-care conversation to discuss the listed factors. Nothing here is a diagnosis.</p>';
    } else {
      head = '<h3>○ Lower signal — self-care information</h3>'
        + '<p>All signals are in the lower range for the inputs you entered. General self-care that supports preventive health includes regular activity, balanced meals, enough sleep, and not smoking. If anything worries you, talk to a clinician anyway — a lower signal does not rule anything out.</p>';
    }
    var g = {
      urgent: {
        start: 'Call your local emergency number now, or go to urgent care immediately. Do not wait for a routine appointment.',
        bring: 'If you can do so without delaying care, bring identification, a list of medicines you take, and any known allergies.',
        next: 'Emergency staff will assess you first and decide what happens next. This tool plays no part in that assessment.',
        soon: 'If you cannot reach emergency care immediately, ask someone nearby to call for you and stay with you until help arrives. Do not drive yourself.',
        self: 'While waiting for help, rest and avoid strenuous activity. This is general information only, not medical advice.'
      },
      strong: {
        start: 'Contact a primary-care clinician promptly — by phone or through their usual booking route — and mention that a screening check put at least one signal in the strong range.',
        bring: 'Bring this page\u2019s listed factors (the inputs that moved each score), a list of medicines you take, and any markers you already know, such as blood pressure or blood sugar.',
        next: 'A clinician will review your inputs with you and decide whether any checks or follow-up are appropriate — one option they may consider is an Adult comprehensive screening pathway. Nothing on this page decides that for them.',
        soon: 'If you cannot reach a clinic soon, keep the listed factors written down, try the clinic\u2019s booking route again, and consider local primary-care or urgent-care options for advice on timing.',
        self: 'General self-care that supports preventive health includes regular activity, balanced meals, enough sleep, and not smoking. It does not replace a clinician conversation.'
      },
      review: {
        start: 'Book a routine primary-care conversation — there is no urgency implied by a review-range signal, so use the clinic\u2019s normal booking route.',
        bring: 'Bring this page\u2019s listed factors (the inputs that moved each score), a list of medicines you take, and any markers you already know.',
        next: 'A clinician will talk through your inputs with you and decide whether anything further is needed — they may consider whether an Adult comprehensive screening pathway fits. A review-range signal is a prompt for that conversation, not a finding.',
        soon: 'If you cannot reach a clinic soon, keep the listed factors written down and try again through the normal booking route. Seek care sooner if anything starts to worry you.',
        self: 'General self-care that supports preventive health includes regular activity, balanced meals, enough sleep, and not smoking.'
      },
      lower: {
        start: 'No appointment is implied by a lower-range result. If anything worries you despite the lower signal, contact a primary-care clinician anyway.',
        bring: 'If you do speak to a clinician, bring the inputs you entered here, so the conversation starts from the same information.',
        next: 'A routine conversation, if you have one, will cover your inputs alongside things this check does not ask about, such as family history and medicines.',
        soon: 'If you cannot reach a clinic soon, the general self-care note below applies, and you can re-run this check if your inputs change. Seek care sooner if anything starts to worry you.',
        self: 'General self-care that supports preventive health includes regular activity, balanced meals, enough sleep, and not smoking. A lower signal does not rule anything out.'
      }
    }[res.urgent ? 'urgent' : res.worst];
    return head
      + '<h4>Where to start</h4><p>' + g.start + '</p>'
      + '<h4>What to bring</h4><p>' + g.bring + '</p>'
      + '<h4>What happens next</h4><p>' + g.next + '</p>'
      + '<h4>If you cannot reach a clinic soon</h4><p>' + g.soon + '</p>'
      + '<h4>A note on self-care</h4><p>' + g.self + '</p>'
      + '<p><em>This is a screening aid only, not a diagnosis, and not medical advice.</em></p>';
  }

  // Empty-state wording for a module with zero contributions. Distinguishes
  // "values were entered but none of them added points" from "nothing was
  // entered": a value counts as provided when it is neither blank ("") nor
  // the marker-select default "unknown".
  function emptyStateText(moduleId, inputs) {
    var mod = null;
    MODULES.forEach(function (m) { if (m.id === moduleId) mod = m; });
    var provided = false;
    if (mod) mod.rules.forEach(function (r) {
      var v = inputs[r[0]];
      if (v !== '' && v !== undefined && v !== 'unknown') provided = true;
    });
    if (provided) {
      return 'No contributing risk factors were found in the inputs you entered for this module. '
        + 'The values you entered did not add points to this screening score. '
        + 'This says nothing about any condition — it is not a diagnosis.';
    }
    return 'No inputs were provided for this module, so no contributing factors are listed. '
      + 'Leaving a field blank adds no points.';
  }

  // Prevention plan — the Prevent-mode equivalent of the triage handoff:
  // a Markdown summary the user can copy, download or print and carry to
  // a clinician. Screening only, never a diagnosis.
  function buildPreventSummary(result, inputs, schedule) {
    inputs = inputs || {};
    var lines = [];
    lines.push('# Prevention Plan — OPD Triage Lens (Prevent mode)');
    lines.push('');
    lines.push('**Assessed:** ' + (schedule && schedule.assessedOn ? schedule.assessedOn.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')));
    lines.push('**Inputs as entered (synthetic demo unless you typed your own):**');
    lines.push('- Age band: ' + (inputs.ageBand || 'not provided'));
    lines.push('- Family history (parents/siblings, broad categories): ' + (inputs.familyHistory || 'not provided'));
    lines.push('- Activity: ' + (inputs.activity || 'not provided') + ' · Smoking: ' + (inputs.smoking || 'not provided'));
    lines.push('- Sleep: ' + (inputs.sleep || 'not provided') + ' · Stress: ' + (inputs.stress || 'not provided'));
    lines.push('- Diet: ' + (inputs.diet || 'not provided') + ' · Sitting: ' + (inputs.sitting || 'not provided'));
    lines.push('- Blood pressure: ' + (inputs.bp || 'not known') + ' · Blood sugar: ' + (inputs.sugar || 'not known'));
    lines.push('- Weight band: ' + (inputs.bmi || 'not known') + ' · Cholesterol: ' + (inputs.chol || 'not known'));
    lines.push('');
    lines.push('## Screening signals (0–100; higher = stronger signal to review)');
    result.modules.forEach(function (m) {
      lines.push('- **' + m.name + ':** ' + m.score + '/100 — ' + m.level.label);
      if (m.contributions.length) {
        m.contributions.forEach(function (c) { lines.push('  - ' + c.label + ' (+' + c.points + ')'); });
      } else {
        lines.push('  - ' + emptyStateText(m.id, inputs));
      }
    });
    lines.push('');
    lines.push('## Next step: ' + (schedule ? schedule.nextStep.label : nextStepFor(result).label));
    lines.push('**Time to next step:** ' + (schedule ? schedule.nextStep.within : nextStepFor(result).within));
    lines.push((schedule ? schedule.nextStep.note : nextStepFor(result).note));
    lines.push('');
    if (schedule && schedule.deferred) {
      lines.push('## Screening schedule');
      lines.push('Deferred — urgent care comes first. Revisit this schedule after urgent care.');
    } else if (schedule) {
      lines.push('## Screening schedule');
      schedule.items.forEach(function (it) {
        lines.push('- **' + it.name + '** — ' + it.intervalLabel + ', due by ' + it.dueLabel + ' (' + it.pathway + ')' + (it.linked ? ' — linked to your inputs' : ''));
      });
    }
    lines.push('');
    lines.push('---');
    lines.push('*This is screening, not a diagnosis. These signals do not identify any disease or condition and are not medical advice. Verify everything with a clinician.*');
    return lines.join('\n');
  }

  var API = {
    INPUT_IDS: INPUT_IDS,
    MODULES: MODULES,
    PERSONAS: PERSONAS,
    SCREENINGS: SCREENINGS,
    PATHWAYS: PATHWAYS,
    levelForScore: levelForScore,
    canContinue: canContinue,
    computeSignals: computeSignals,
    nextStepFor: nextStepFor,
    buildSchedule: buildSchedule,
    buildTriageHtml: buildTriageHtml,
    emptyStateText: emptyStateText,
    buildPreventSummary: buildPreventSummary,
    monthYear: monthYear
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else {
    root.OPD_PREVENT = API;
  }
})(typeof self !== 'undefined' ? self : this, null);
