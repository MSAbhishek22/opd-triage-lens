// OPD Triage Lens — labelled symptom corpus (v1.0, 12 Nov 2026)
// ---------------------------------------------------------------------------
// Every entry is a deterministic, human-written rule. No model, no API, no
// inference. Keywords are English + Hinglish (romanised) as patients in an
// Indian OPD actually describe symptoms.
// COLOURS: RED = emergency (now), AMBER = urgent (same-day), GREEN = routine
// (next available), BLUE = self-care / routine checkup.
// This corpus is a decision-support aid for OPD FLOW. It does NOT diagnose.
// Every screen of the app carries that disclaimer.
//
// Accuracy is measured on LABELLED_CASES below — our own labelled test set
// (built by us, not real patient data). The number is honest about what it
// is: agreement between the engine and our own labels.

(function (root) {
  'use strict';

  var COLOURS = {
    RED:    { code: 'RED',    label: 'Emergency',   hindi: 'Turant',   rank: 4 },
    AMBER:  { code: 'AMBER',  label: 'Urgent',      hindi: 'Aaj hi',   rank: 3 },
    GREEN:  { code: 'GREEN',  label: 'Routine',     hindi: 'Aaram se', rank: 2 },
    BLUE:   { code: 'BLUE',   label: 'Self-care',   hindi: 'Ghar par', rank: 1 },
    UNKNOWN:{ code: 'UNKNOWN',label: 'Cannot triage',hindi: 'Pata nahi',rank: 0 }
  };

  // Each entry: id, label, keywords (phrases score 2, single tokens score 1),
  // colour, redFlag (forces RED when matched), severityEscalates (severity
  // words push it one step up), advice (short, shown with the verdict).
  var ENTRIES = [
    // ---- RED (emergency) ----
    { id: 'chest-pain-breathless', label: 'Chest pain with breathlessness / sweating', colour: 'RED', redFlag: true,
      keywords: ['chest pain', 'seene me dard', 'seene mein dard', 'chhati me dard', 'chhati mein dard', 'breathless', 'breathlessness', 'saans phoolna', 'saans lene me takleef', 'saans lene mein takleef', 'sweating', 'paseena', 'left arm pain', 'baayein haath me dard'],
      advice: 'Possible cardiac emergency. Do not wait for an OPD slot — go to emergency now or call 108.' },
    { id: 'unconscious', label: 'Unconscious / fainted', colour: 'RED', redFlag: true,
      keywords: ['unconscious', 'behosh', 'behosh ho gaya', 'hosh nahi', 'fainted', 'faint'],
      advice: 'Emergency. Call 108 and keep the person on their side; do not give food or water.' },
    { id: 'severe-bleeding', label: 'Heavy bleeding that will not stop', colour: 'RED', redFlag: true,
      keywords: ['heavy bleeding', 'khoon beh raha hai', 'khoon nahi ruk raha', 'bleeding won\'t stop', 'bleeding wont stop', 'blood loss', 'bahut khoon'],
      advice: 'Emergency. Press firmly on the wound with a clean cloth and go to emergency now.' },
    { id: 'stroke-signs', label: 'Stroke signs (face / arm / speech)', colour: 'RED', redFlag: true,
      keywords: ['face droop', 'face tedha', 'slurred speech', 'bolne me dikkat', 'one side weak', 'ek taraf kamzori', 'ek taraf kamzor', 'arm weakness', 'sudden numbness'],
      advice: 'Possible stroke — every minute counts. Go to emergency now; note the time symptoms started.' },
    { id: 'severe-breathlessness', label: 'Cannot breathe / severe breathlessness', colour: 'RED', redFlag: true,
      keywords: ['can\'t breathe', 'cant breathe', 'saans nahi aa rahi', 'saans nahi aa raha', 'severe breathlessness', 'gasping'],
      advice: 'Emergency. Sit upright, loosen tight clothing, call 108.' },
    { id: 'seizure', label: 'Seizure / fit', colour: 'RED', redFlag: true,
      keywords: ['seizure', 'mirgi', 'fit aa raha', 'convulsion', 'jhatke aa rahe'],
      advice: 'Emergency. Clear the area, do not hold the person down, do not put anything in the mouth. Call 108 if it lasts over 5 minutes.' },
    { id: 'head-injury', label: 'Head injury', colour: 'RED', redFlag: true,
      keywords: ['head injury', 'sir pe chot', 'sir par chot', 'head injury bleeding'],
      advice: 'Emergency. Do not move the person if the neck may be hurt; go to emergency now.' },
    { id: 'stiff-neck', label: 'Stiff neck (with fever = emergency)', colour: 'AMBER', redFlag: false,
      keywords: ['stiff neck', 'gardan akdi', 'neck stiffness'],
      advice: 'Stiff neck needs urgent checking. With fever it is an emergency — see combination rule.' },

    // ---- AMBER (urgent, same-day) ----
    { id: 'chest-pain', label: 'Chest pain (alone)', colour: 'AMBER', redFlag: false,
      keywords: ['chest pain', 'seene me dard', 'seene mein dard', 'chhati me dard'],
      advice: 'Chest pain always needs same-day checking (ECG). If breathlessness or sweating starts, it becomes an emergency.' },
    { id: 'high-fever', label: 'High fever (102°F / 39°C and above)', colour: 'AMBER', redFlag: false,
      keywords: ['high fever', 'tez bukhar', '103 fever', '104 fever', '102 fever'],
      advice: 'High fever needs same-day review. Keep fluids up; do not self-start antibiotics.' },
    { id: 'severe-abdominal', label: 'Severe stomach / abdominal pain', colour: 'AMBER', redFlag: false,
      keywords: ['severe stomach pain', 'pet me tez dard', 'pet mein tez dard', 'abdominal pain', 'pet me bahut dard'],
      advice: 'Severe abdominal pain needs same-day review — especially with vomiting, fever or a hard belly.' },
    { id: 'vomiting-repeated', label: 'Repeated vomiting', colour: 'AMBER', redFlag: false,
      keywords: ['baar baar ulti', 'repeated vomiting', 'vomiting again and again'],
      advice: 'Repeated vomiting risks dehydration — same-day review. Small sips of ORS / water in the meantime.' },
    { id: 'injury-swelling', label: 'Injury with swelling', colour: 'AMBER', redFlag: false,
      keywords: ['swelling', 'sujan', 'sprain', 'moch', 'twisted ankle', 'ankle twist'],
      advice: 'Same-day review — a swollen injury may need an X-ray. Rest, ice, elevate till then.' },
    { id: 'breathless-exertion', label: 'Breathlessness on walking / exertion', colour: 'AMBER', redFlag: false,
      keywords: ['breathless on walking', 'chalne pe saans phoolna', 'breathless while walking', 'chalne par saans'],
      advice: 'Breathlessness on exertion needs same-day review — note how far you can walk before it starts.' },
    { id: 'burning-urine', label: 'Burning urination', colour: 'AMBER', redFlag: false,
      keywords: ['burning urine', 'peshaab me jalan', 'peshab me jalan', 'pain while urinating', 'uti'],
      advice: 'Same-day review — likely a urine infection. Drink water; do not self-start antibiotics.' },
    { id: 'severe-headache', label: 'Sudden severe headache', colour: 'AMBER', redFlag: false,
      keywords: ['sudden severe headache', 'tez sir dard', 'worst headache', 'sir me tez dard'],
      advice: 'A sudden severe headache needs same-day review — especially if it is the worst you have ever had.' },
    { id: 'blood-stool', label: 'Blood in stool / urine', colour: 'AMBER', redFlag: false,
      keywords: ['blood in stool', 'potty me khoon', 'dast me khoon', 'blood in urine', 'peshaab me khoon'],
      advice: 'Blood in stool or urine always needs same-day review. Note the colour and amount.' },
    { id: 'ear-pain', label: 'Ear pain', colour: 'AMBER', redFlag: false,
      keywords: ['ear pain', 'kaan me dard', 'kaan dard'],
      advice: 'Same-day review — ear pain can worsen fast. Do not put oil or drops in without advice.' },
    { id: 'tooth-pain', label: 'Tooth pain', colour: 'AMBER', redFlag: false,
      keywords: ['tooth pain', 'daant me dard', 'daant dard'],
      advice: 'Same-day dental review. Warm salt-water rinse helps till then; avoid hot/cold on that side.' },

    // ---- GREEN (routine, next available) ----
    { id: 'fever', label: 'Fever (mild, under 3 days)', colour: 'GREEN', redFlag: false,
      keywords: ['fever', 'bukhar', 'halka bukhar', 'mild fever'],
      advice: 'Routine slot. Rest, fluids, paracetamol as directed; come back sooner if fever crosses 102°F or lasts 3+ days.' },
    { id: 'cold-cough', label: 'Cold / cough / sore throat', colour: 'GREEN', redFlag: false,
      keywords: ['cold', 'sardi', 'cough', 'khansi', 'sore throat', 'gale me dard', 'gale me kharash', 'running nose', 'naak behna'],
      advice: 'Routine slot. Warm fluids and rest; come sooner if breathing gets difficult or fever stays high.' },
    { id: 'headache', label: 'Headache (mild)', colour: 'GREEN', redFlag: false,
      keywords: ['headache', 'sir dard', 'sir me dard', 'mild headache'],
      advice: 'Routine slot. Rest, water, avoid screens; come sooner if it becomes sudden and severe.' },
    { id: 'rash', label: 'Skin rash / itching', colour: 'GREEN', redFlag: false,
      keywords: ['rash', 'daane', 'itching', 'khujli', 'skin rash'],
      advice: 'Routine slot. Do not scratch or apply steroid creams on your own; note what you ate or touched.' },
    { id: 'back-pain', label: 'Back pain', colour: 'GREEN', redFlag: false,
      keywords: ['back pain', 'kamar dard', 'kamar me dard'],
      advice: 'Routine slot. Gentle movement helps more than bed rest; avoid lifting heavy things.' },
    { id: 'joint-pain', label: 'Joint / knee pain', colour: 'GREEN', redFlag: false,
      keywords: ['joint pain', 'ghutne me dard', 'ghutna dard', 'knee pain'],
      advice: 'Routine slot. Rest the joint, use a cold pack; note if it is hot, red or swollen.' },
    { id: 'acidity', label: 'Acidity / gas', colour: 'GREEN', redFlag: false,
      keywords: ['acidity', 'gas', 'pet me gas', 'heartburn', 'seene me jalan'],
      advice: 'Routine slot. Small frequent meals, avoid spicy/oily food and late dinners.' },
    { id: 'diarrhoea', label: 'Loose motions', colour: 'GREEN', redFlag: false,
      keywords: ['loose motion', 'dast', 'loose motions'],
      advice: 'Routine slot — unless there is blood (that is urgent). ORS after every motion; come sooner if you cannot keep fluids down.' },
    { id: 'vomiting-once', label: 'Vomiting (once)', colour: 'GREEN', redFlag: false,
      keywords: ['vomiting', 'ulti', 'vomit'],
      advice: 'Routine slot if it was once and you are keeping fluids down. Small sips of ORS; come sooner if it repeats.' },
    { id: 'dizziness', label: 'Dizziness', colour: 'GREEN', redFlag: false,
      keywords: ['dizzy', 'chakkar', 'chakkar aana'],
      advice: 'Routine slot. Sit or lie down when dizzy, drink water, stand up slowly; come sooner if it repeats with vomiting.' },

    // ---- BLUE (self-care / routine checkup) ----
    { id: 'checkup', label: 'General health checkup', colour: 'BLUE', redFlag: false,
      keywords: ['checkup', 'health checkup', 'general checkup', 'full body checkup'],
      advice: 'No urgent slot needed — book a routine checkup at your convenience.' },
    { id: 'vaccination', label: 'Vaccination', colour: 'BLUE', redFlag: false,
      keywords: ['vaccine', 'vaccination', 'teeka', 'tika'],
      advice: 'No urgent slot needed — visit the immunisation counter on any OPD day.' },
    { id: 'tiredness', label: 'Tiredness / fatigue', colour: 'BLUE', redFlag: false,
      keywords: ['tired', 'thakan', 'fatigue', 'thaka hua'],
      advice: 'Self-care first: sleep, water, regular meals. Book a routine slot if it lasts more than 2 weeks.' },
    { id: 'minor-cut', label: 'Small cut / minor injury', colour: 'BLUE', redFlag: false,
      keywords: ['small cut', 'chhota cut', 'minor cut', 'chhoti chot'],
      advice: 'Clean with water, apply antiseptic, cover. Come in if it is deep, dirty, or keeps bleeding.' },
    { id: 'diet-vitamin', label: 'Diet / vitamin question', colour: 'BLUE', redFlag: false,
      keywords: ['diet', 'vitamin', 'vitamins'],
      advice: 'Self-care information — a balanced diet covers most vitamins. Ask at your next routine visit before starting supplements.' }
  ];

  // Explicit combination rules — these are the "doctor's second look".
  // Each rule: when the listed entry ids are ALL matched, force the colour
  // and attach the note. They are evaluated before the single-entry verdict.
  var COMBINATIONS = [
    // needsKeywords: at least one of these must ALSO be among the matched
    // keywords — entry ids alone are not enough (e.g. "chest pain" alone
    // matches the breathlessness entry via its "chest pain" keyword, but
    // must stay AMBER until breathlessness / sweating actually appears).
    { id: 'cardiac', needs: ['chest-pain', 'chest-pain-breathless'],
      needsKeywords: ['breathless', 'breathlessness', 'saans phoolna', 'saans lene me takleef', 'saans lene mein takleef', 'sweating', 'paseena', 'left arm pain', 'baayein haath me dard'],
      force: 'RED',
      note: 'Chest pain WITH breathlessness / sweating — treat as a possible cardiac emergency.' },
    { id: 'meningitis', needs: ['fever', 'stiff-neck'], force: 'RED',
      note: 'Fever WITH a stiff neck — needs emergency evaluation (possible meningitis).' },
    { id: 'bloody-diarrhoea', needs: ['diarrhoea', 'blood-stool'], force: 'AMBER',
      note: 'Blood with loose motions — same-day review, do not wait for a routine slot.' },
    { id: 'vomit-dizzy', needs: ['vomiting-once', 'dizziness'], force: 'AMBER',
      note: 'Vomiting WITH dizziness — dehydration risk, same-day review.' }
  ];

  // Duration phrases: "3 din se", "since 3 days", "4 din", "hafte bhar".
  // Fever / cold-cough lasting 3+ days escalates GREEN -> AMBER.
  var DURATION_ESCALATE_IDS = ['fever', 'cold-cough'];

  // Labelled test cases — the engine is measured against these. Each case is
  // our own label (not real patient data). ageGroup: 'adult' | 'child' |
  // 'elderly' | 'pregnant'. load is not part of the colour verdict.
  var LABELLED_CASES = [
    // RED (10)
    { text: 'chest pain and breathlessness', expected: 'RED' },
    { text: 'seene me dard, saans phoolna', expected: 'RED' },
    { text: 'chest pain with sweating', expected: 'RED' },
    { text: 'behosh ho gaya', expected: 'RED' },
    { text: 'khoon beh raha hai, ruk nahi raha', expected: 'RED' },
    { text: 'face tedha ho gaya, bolne me dikkat', expected: 'RED' },
    { text: 'saans nahi aa rahi', expected: 'RED' },
    { text: 'mirgi ka daura, jhatke aa rahe hain', expected: 'RED' },
    { text: 'sir pe chot lagi, khoon beh raha hai', expected: 'RED' },
    { text: 'bukhar hai aur gardan akdi hui hai', expected: 'RED' },
    // AMBER (15)
    { text: 'chest pain', expected: 'AMBER' },
    { text: 'pet me tez dard', expected: 'AMBER' },
    { text: 'baar baar ulti ho rahi hai', expected: 'AMBER' },
    { text: 'ankle twist ho gaya, sujan aa gayi', expected: 'AMBER' },
    { text: 'chalne pe saans phoolna', expected: 'AMBER' },
    { text: 'peshaab me jalan hai', expected: 'AMBER' },
    { text: 'tez sir dard, sudden', expected: 'AMBER' },
    { text: 'potty me khoon aa raha hai', expected: 'AMBER' },
    { text: 'kaan me dard hai', expected: 'AMBER' },
    { text: 'daant me dard hai', expected: 'AMBER' },
    { text: 'bukhar 4 din se hai', expected: 'AMBER' },
    { text: 'bukhar hai', expected: 'AMBER', ageGroup: 'child' },
    { text: 'ulti ho rahi hai aur chakkar aa raha hai', expected: 'AMBER' },
    { text: 'dast me khoon aa raha hai', expected: 'AMBER' },
    { text: 'high fever 103', expected: 'AMBER' },
    // GREEN (10)
    { text: 'bukhar 2 din se hai', expected: 'GREEN' },
    { text: 'khansi aur sardi hai', expected: 'GREEN' },
    { text: 'sir dard hai', expected: 'GREEN' },
    { text: 'daane aur khujli ho rahi hai', expected: 'GREEN' },
    { text: 'kamar dard hai', expected: 'GREEN' },
    { text: 'ghutne me dard hai', expected: 'GREEN' },
    { text: 'pet me gas, acidity hai', expected: 'GREEN' },
    { text: 'dast ho gaya hai', expected: 'GREEN' },
    { text: 'ek baar ulti hui', expected: 'GREEN' },
    { text: 'chakkar aana', expected: 'GREEN' },
    // BLUE (5)
    { text: 'general checkup karwana hai', expected: 'BLUE' },
    { text: 'vaccine lagwana hai', expected: 'BLUE' },
    { text: 'thakan rehti hai', expected: 'BLUE' },
    { text: 'chhota cut lag gaya hai', expected: 'BLUE' },
    { text: 'vitamin kaun sa loon', expected: 'BLUE' },
    // UNKNOWN — honest refusal (5)
    { text: 'mere baal jhad rahe hain', expected: 'UNKNOWN' },
    { text: 'I feel strange', expected: 'UNKNOWN' },
    { text: 'dard', expected: 'UNKNOWN' },
    { text: 'kuch samajh nahi aa raha', expected: 'UNKNOWN' },
    { text: '', expected: 'UNKNOWN' }
  ];

  var DATA = {
    COLOURS: COLOURS,
    ENTRIES: ENTRIES,
    COMBINATIONS: COMBINATIONS,
    DURATION_ESCALATE_IDS: DURATION_ESCALATE_IDS,
    LABELLED_CASES: LABELLED_CASES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA;
  } else {
    root.OPD_TRIAGE_CORPUS = DATA;
  }
})(typeof self !== 'undefined' ? self : this);
