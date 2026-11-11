// OPD Triage Lens — UI logic (v1.0, 12 Nov 2026)
// No backend, no model, no data leaves the device. All triage runs in-page
// via window.OPD_TRIAGE (engine.js) over window.OPD_TRIAGE_CORPUS (corpus.js).
(function () {
  'use strict';

  var T = window.OPD_TRIAGE;
  var C = window.OPD_TRIAGE_CORPUS;

  function $(id) { return document.getElementById(id); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  var NEEDLE_ANGLE = { RED: 45, AMBER: 135, GREEN: 225, BLUE: 315, UNKNOWN: -90 };

  // ---------------------------------------------------------------------------
  // Stats + accuracy (computed live from the same engine the tests run)
  // ---------------------------------------------------------------------------
  function renderStats() {
    $('statRules').textContent = C.ENTRIES.length;
    $('statCases').textContent = C.LABELLED_CASES.length;
    var m = T.measureAccuracy();
    $('statAccuracy').textContent = m.accuracy + '%';
    $('accuracyText').textContent =
      'On our own 45-case labelled test set the engine agrees with our labels ' +
      m.correct + ' out of ' + m.total + ' times (' + m.accuracy + '%) — ' +
      'RED ' + m.perColour.RED.correct + '/' + m.perColour.RED.total + ', ' +
      'AMBER ' + m.perColour.AMBER.correct + '/' + m.perColour.AMBER.total + ', ' +
      'GREEN ' + m.perColour.GREEN.correct + '/' + m.perColour.GREEN.total + ', ' +
      'BLUE ' + m.perColour.BLUE.correct + '/' + m.perColour.BLUE.total + ', ' +
      'UNKNOWN ' + m.perColour.UNKNOWN.correct + '/' + m.perColour.UNKNOWN.total + '.';
  }

  // ---------------------------------------------------------------------------
  // Quick chips
  // ---------------------------------------------------------------------------
  var QUICK = [
    'bukhar 2 din se hai', 'khansi aur sardi', 'seene me dard',
    'pet me tez dard', 'ulti ho rahi hai', 'chakkar aana',
    'daant me dard', 'general checkup karwana hai'
  ];
  function renderChips() {
    var box = $('quickChips');
    QUICK.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = q;
      b.addEventListener('click', function () {
        $('symptoms').value = q;
        $('symptoms').focus();
        runTriage();
      });
      box.appendChild(b);
    });
  }

  // ---------------------------------------------------------------------------
  // Voice input (Web Speech API — browser built-in, no key, no payment).
  // Typing is the primary path; voice is an optional enhancement.
  // ---------------------------------------------------------------------------
  var recognition = null;
  var listening = false;
  function setupVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var btn = $('voiceBtn');
    if (!SR) {
      btn.disabled = true;
      btn.textContent = '🎙 Voice input — not supported in this browser';
      $('voiceNote').textContent = 'Voice input needs Chrome or Edge. Typing always works — it is the primary path.';
      return;
    }
    recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = function (ev) {
      var text = '';
      for (var i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      $('symptoms').value = text;
    };
    recognition.onend = function () {
      listening = false;
      btn.textContent = '🎙 Voice input';
      btn.setAttribute('aria-pressed', 'false');
      if ($('symptoms').value.trim()) runTriage();
    };
    recognition.onerror = function () {
      listening = false;
      btn.textContent = '🎙 Voice input';
      $('voiceNote').textContent = 'Voice did not hear anything — please type the symptoms instead.';
    };
    btn.addEventListener('click', function () {
      if (listening) { recognition.stop(); return; }
      listening = true;
      btn.textContent = '● Listening… tap to stop';
      btn.setAttribute('aria-pressed', 'true');
      try { recognition.start(); } catch (e) { listening = false; btn.textContent = '🎙 Voice input'; }
    });
  }

  // ---------------------------------------------------------------------------
  // Triage run + result render
  // ---------------------------------------------------------------------------
  function readOpts() {
    var age = (document.querySelector('input[name="ageGroup"]:checked') || {}).value || 'adult';
    var load = (document.querySelector('input[name="load"]:checked') || {}).value || 'moderate';
    var vitals = {};
    var t = $('vTemp').value.trim();
    var p = $('vPulse').value.trim();
    var bp = $('vBp').value.trim();
    var s = $('vSpo2').value.trim();
    if (t) vitals.tempF = Number(t);
    if (p) vitals.pulse = Number(p);
    if (bp) vitals.bp = bp;
    if (s) vitals.spo2 = Number(s);
    return { ageGroup: age, load: load, vitals: vitals, patient: $('vName').value.trim() };
  }

  function renderResult(r, opts) {
    var card = $('resultCard');
    $('resultEmpty').hidden = true;
    card.hidden = false;
    card.setAttribute('data-colour', r.colour);
    var meta = T.COLOURS[r.colour] || T.COLOURS.UNKNOWN;
    $('verdictColour').textContent = r.colour;
    $('verdictLabel').textContent = meta.label + ' · ' + meta.hindi;
    $('verdictConf').textContent = 'Confidence: ' + r.confidence;
    $('verdictAdvice').textContent = r.advice;
    $('verdictRule').textContent = r.entry ? r.entry.label + ' — ' + r.entry.id : 'None — could not triage';
    $('verdictWords').textContent = r.matched.length ? r.matched.join(', ') : '—';
    $('verdictSlot').textContent = r.slot;

    var notesBox = $('verdictNotes');
    notesBox.innerHTML = '';
    r.notes.forEach(function (n) {
      var p = document.createElement('p');
      p.textContent = n;
      notesBox.appendChild(p);
    });
    var escBox = $('verdictEscalations');
    escBox.innerHTML = '';
    r.escalations.forEach(function (e) {
      var p = document.createElement('p');
      p.textContent = e;
      escBox.appendChild(p);
    });

    var md = T.buildHandoff(r, opts);
    $('handoffText').textContent = md;
    $('copyMsg').textContent = '';

    // Needle + hub follow the verdict.
    var needle = $('needle');
    needle.style.transform = 'rotate(' + (NEEDLE_ANGLE[r.colour] || -90) + 'deg)';
    $('dialHubLabel').textContent = r.colour === 'UNKNOWN' ? 'OPD' : r.colour;

    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function runTriage() {
    var input = $('symptoms').value;
    var err = $('inputError');
    if (!input.trim()) {
      err.hidden = false;
      $('symptoms').focus();
      return;
    }
    err.hidden = true;
    var opts = readOpts();
    var r = T.triage(input, opts);
    renderResult(r, opts);
  }

  // Sample cases (from the labelled set — real engine behaviour, not staged).
  var SAMPLES = {
    red: 'seene me dard, saans phoolna',
    amber: 'pet me tez dard',
    refusal: 'mere baal jhad rahe hain'
  };

  // ---------------------------------------------------------------------------
  // Handoff actions
  // ---------------------------------------------------------------------------
  function setupHandoff() {
    on($('copyBtn'), 'click', function () {
      var text = $('handoffText').textContent;
      function done() { $('copyMsg').textContent = 'Copied ✓'; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
    on($('downloadBtn'), 'click', function () {
      var blob = new Blob([$('handoffText').textContent], { type: 'text/markdown' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'opd-triage-handoff.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      $('copyMsg').textContent = 'Downloaded ✓';
    });
    on($('printBtn'), 'click', function () { window.print(); });
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
    ta.remove();
  }

  // ---------------------------------------------------------------------------
  // 3D dial — pointer tilt (transform only), quadrant filter
  // ---------------------------------------------------------------------------
  function setupDial() {
    var face = $('dialFace');
    var stage = document.querySelector('.dial-stage');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function lowMotion() { return document.documentElement.getAttribute('data-low-motion') === 'true' || reduced; }
    if (stage && !('ontouchstart' in window)) {
      stage.addEventListener('pointermove', function (ev) {
        if (lowMotion()) return;
        var r = face.getBoundingClientRect();
        var px = (ev.clientX - (r.left + r.width / 2)) / r.width;
        var py = (ev.clientY - (r.top + r.height / 2)) / r.height;
        face.style.transform = 'rotateY(' + (px * 14).toFixed(1) + 'deg) rotateX(' + (-py * 14).toFixed(1) + 'deg)';
      });
      stage.addEventListener('pointerleave', function () {
        face.style.transform = 'rotateY(0deg) rotateX(0deg)';
      });
    }
    document.querySelectorAll('.quad').forEach(function (q) {
      q.addEventListener('click', function () {
        setFilter(q.getAttribute('data-colour'));
        document.getElementById('corpus').scrollIntoView({ behavior: lowMotion() ? 'auto' : 'smooth' });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Corpus explorer
  // ---------------------------------------------------------------------------
  var currentFilter = 'ALL';
  function setFilter(colour) {
    currentFilter = colour;
    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-filter') === colour);
    });
    renderCorpus();
  }
  function renderCorpus() {
    var q = ($('corpusSearch').value || '').toLowerCase().trim();
    var grid = $('corpusGrid');
    grid.innerHTML = '';
    var shown = 0;
    C.ENTRIES.forEach(function (e) {
      if (currentFilter !== 'ALL' && e.colour !== currentFilter) return;
      if (q) {
        var hay = (e.label + ' ' + e.keywords.join(' ') + ' ' + e.advice).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      shown += 1;
      var card = document.createElement('article');
      card.className = 'rule-card';
      card.setAttribute('data-colour', e.colour);
      var h = document.createElement('h3');
      h.textContent = e.label;
      var tag = document.createElement('span');
      tag.className = 'rule-tag ' + e.colour;
      tag.textContent = e.colour + ' · ' + e.id;
      var kws = document.createElement('p');
      kws.className = 'rule-kws';
      kws.textContent = 'matches: ' + e.keywords.join(' · ');
      var adv = document.createElement('p');
      adv.className = 'rule-advice';
      adv.textContent = e.advice;
      card.appendChild(tag);
      card.appendChild(h);
      card.appendChild(kws);
      card.appendChild(adv);
      if (e.redFlag) {
        var flag = document.createElement('span');
        flag.className = 'rule-flag';
        flag.textContent = 'RED FLAG';
        card.appendChild(flag);
      }
      grid.appendChild(card);
    });
    $('corpusEmpty').hidden = shown !== 0;
    var counts = { ALL: C.ENTRIES.length, RED: 0, AMBER: 0, GREEN: 0, BLUE: 0 };
    C.ENTRIES.forEach(function (e) { counts[e.colour] += 1; });
    Object.keys(counts).forEach(function (k) {
      var el = $('count' + k);
      if (el) el.textContent = '(' + counts[k] + ')';
    });
  }
  function setupCorpus() {
    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.addEventListener('click', function () { setFilter(b.getAttribute('data-filter')); });
    });
    $('corpusSearch').addEventListener('input', renderCorpus);
    renderCorpus();
  }

  // ---------------------------------------------------------------------------
  // Low-motion toggle
  // ---------------------------------------------------------------------------
  function setupMotion() {
    var btn = $('motionToggle');
    var saved = null;
    try { saved = window.localStorage.getItem('opd-low-motion'); } catch (e) { /* storage unavailable */ }
    if (saved === '1') apply(true);
    btn.addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-low-motion') !== 'true';
      apply(now);
      try { window.localStorage.setItem('opd-low-motion', now ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    });
    function apply(on) {
      document.documentElement.setAttribute('data-low-motion', on ? 'true' : 'false');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = 'Low motion: ' + (on ? 'on' : 'off');
    }
  }

  // ---------------------------------------------------------------------------
  // Wire everything up
  // ---------------------------------------------------------------------------
  on($('triageBtn'), 'click', runTriage);
  on($('symptoms'), 'keydown', function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') runTriage();
  });
  document.querySelectorAll('[data-sample]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('symptoms').value = SAMPLES[b.getAttribute('data-sample')];
      runTriage();
    });
  });

  renderStats();
  renderChips();
  setupVoice();
  setupHandoff();
  setupDial();
  setupCorpus();
  setupMotion();
})();
