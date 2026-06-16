// JHTV Grant Eligibility Stress Test
// Extracts getGrants() from jhtv_grant_eligibility.html at runtime — always in sync.
// Run: node stress_test.js

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Extract getGrants from HTML ────────────────────────────────────────────────
const html     = fs.readFileSync(path.join(__dirname, 'jhtv_grant_eligibility.html'), 'utf8');
const fnStart  = html.indexOf('\nfunction getGrants(d) {');
const fnEnd    = html.indexOf('\n// ── Pursuing Tracker', fnStart);

if (fnStart === -1 || fnEnd === -1) {
  console.error('❌ Could not locate getGrants() in jhtv_grant_eligibility.html');
  process.exit(1);
}

const fnSource  = html.slice(fnStart + 1, fnEnd).trim();
const getGrants = new Function(`${fnSource}; return getGrants;`)();

// ── Persona definitions ────────────────────────────────────────────────────────
// All field names match the live HTML form (see collectData() in the HTML).
//
// Fields:
//   ventureStage:  ideation | forming | pre_seed | seed | growth
//   entityType:    llc_corp | partnership | sole_prop | none
//   technologyType: therapeutic | device | digital_health | life_tools | synbio | non_medical
//   jhuSchool:     wse | som | bsph | krieger | nursing | other_jhu | none
//   leadRole:      faculty | postdoc | student | external
//   jhtv:          yes | no
//   licensing:     unlicensed | lt12 | gt12 | noip
//   siteMiner:     yes | no
//   siteMinerDays: number string
//   marylandBased: yes | planning | no
//   baltimoreArea: yes | no  (shown when marylandBased='yes'; drives bii eligibility)
//   teamSize:      founders_only | 1_5 | 6_15 | 16_50 | over_50
//   dilutive:      0 | lt500k | lt2m | lt5m | gt5m
//   sedi:          sedi | rural | both | none
//   stemCells:     yes | no
//   diseaseArea:   cardio | neuro | cancer | cf | amr | womens | peds | veterans | global | other
//   hasSbirPhaseI: yes | no  (drives sbir_match eligibility)

const personas = [
  {
    name: 'JHU Cardiovascular LLC (full-fit)',
    data: {
      ventureStage: 'seed', entityType: 'llc_corp', technologyType: 'therapeutic',
      jhuSchool: 'som', leadRole: 'faculty', jhtv: 'yes', licensing: 'lt12',
      siteMiner: 'yes', siteMinerDays: '45',
      marylandBased: 'yes', baltimoreArea: 'yes',
      teamSize: '1_5', dilutive: '0', sedi: 'none',
      stemCells: 'no', diseaseArea: 'cardio',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'eligible',
      mii_joint:  'conditional', // JHU✓ disclosure✓ MD✓ siteMiner(45d)✓ → USM partner warn
      mii_cf:     'eligible',    // JHU✓ disclosure✓ MD✓ siteMiner✓ llc_corp✓
      bii:        'eligible',    // MD✓ Baltimore✓
      sbir_match: 'ineligible',  // MD✓ but no Phase I award
      mscrf:      'ineligible',  // stemCells=no
      builder:    'ineligible',  // no SEDI
      inclusion:  'ineligible',  // no SEDI
      rbii:       'ineligible',  // not rural
      nih_sbir:   'eligible',
      nih_sttr:   'eligible',
      nsf_sbir:   'eligible',
      arpah:      'eligible',
      dod_sbir:   'eligible',
      darpa:      'eligible',
      fda_cdc:    'eligible',
      doe_sbir:   'conditional', // isMedical → weak DOE fit
      barda:      'eligible',
      carbx:      'ineligible',  // cardio, not AMR
      va_sbir:    'conditional', // healthtech but not veterans
      coulter:    'eligible',
      mmf:        'conditional', // MD✓ but JHU≠USM
      aha:        'eligible',
      alz:        'ineligible',
      mjff:       'ineligible',
      cfft:       'ineligible',
      wellcome:   'eligible',
      bwf:        'eligible',
    },
  },

  {
    name: 'Non-JHU AMR Therapeutic (Maryland)',
    data: {
      ventureStage: 'pre_seed', entityType: 'llc_corp', technologyType: 'therapeutic',
      jhuSchool: 'none', leadRole: 'faculty', jhtv: 'no', licensing: 'noip',
      siteMiner: 'no', siteMinerDays: '',
      marylandBased: 'yes', baltimoreArea: 'no',
      teamSize: '1_5', dilutive: 'lt500k', sedi: 'none',
      stemCells: 'no', diseaseArea: 'amr',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'ineligible',  // no JHU
      mii_joint:  'ineligible',  // no JHU
      mii_cf:     'ineligible',  // no JHU
      bii:        'ineligible',  // MD✓ but Baltimore=no
      sbir_match: 'ineligible',  // MD✓ but no Phase I award
      mscrf:      'ineligible',  // no stemCells
      builder:    'ineligible',  // no SEDI
      inclusion:  'ineligible',  // no SEDI
      rbii:       'ineligible',  // not rural
      nih_sbir:   'eligible',
      nih_sttr:   'eligible',    // warn (no JHU partner) but no fail
      nsf_sbir:   'eligible',
      arpah:      'eligible',
      dod_sbir:   'eligible',    // AMR = biodefense priority
      darpa:      'eligible',    // therapeutic
      fda_cdc:    'eligible',    // therapeutic + AMR
      doe_sbir:   'conditional', // isMedical → weak DOE fit
      barda:      'eligible',    // isMedical + AMR priority
      carbx:      'eligible',    // therapeutic + AMR = perfect fit
      va_sbir:    'conditional', // healthtech but not veterans
      coulter:    'ineligible',  // no JHU
      mmf:        'conditional', // MD✓ but USM check
      aha:        'ineligible',  // amr not cardio
      alz:        'ineligible',
      mjff:       'ineligible',
      cfft:       'ineligible',
      wellcome:   'eligible',
      bwf:        'eligible',    // faculty + medical
    },
  },

  {
    name: 'Rural SEDI Founder, No Entity Yet (device)',
    data: {
      ventureStage: 'forming', entityType: 'none', technologyType: 'device',
      jhuSchool: 'none', leadRole: 'external', jhtv: 'no', licensing: 'noip',
      siteMiner: 'no', siteMinerDays: '',
      marylandBased: 'yes', baltimoreArea: 'no',
      teamSize: 'founders_only', dilutive: '0', sedi: 'both',
      stemCells: 'no', diseaseArea: 'other',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'ineligible',  // no JHU
      mii_joint:  'ineligible',  // no JHU
      mii_cf:     'ineligible',  // no JHU
      bii:        'ineligible',  // MD✓ but Baltimore=no
      sbir_match: 'ineligible',  // MD✓ but no Phase I award
      mscrf:      'ineligible',  // no stemCells
      builder:    'conditional', // MD✓ SEDI✓ but no FTE yet
      inclusion:  'eligible',    // MD✓ SEDI✓ early dilutive
      rbii:       'eligible',    // rural✓ early-stage✓ small team✓
      nih_sbir:   'ineligible',  // no entity
      nih_sttr:   'ineligible',  // no entity
      nsf_sbir:   'ineligible',  // no entity
      arpah:      'ineligible',  // no entity
      dod_sbir:   'ineligible',  // no entity
      darpa:      'ineligible',  // no entity
      fda_cdc:    'ineligible',  // no entity
      doe_sbir:   'ineligible',  // no entity
      barda:      'ineligible',  // no entity
      carbx:      'ineligible',  // not therapeutic
      va_sbir:    'ineligible',  // no entity
      coulter:    'ineligible',  // no JHU
      mmf:        'conditional', // MD✓ but USM check
      aha:        'ineligible',  // other disease
      alz:        'ineligible',
      mjff:       'ineligible',
      cfft:       'ineligible',
      wellcome:   'eligible',    // healthtech (device)
      bwf:        'ineligible',  // external role
    },
  },

  {
    name: 'Stem Cell Neurodegeneration (JHU, Maryland, has SBIR Phase I)',
    data: {
      ventureStage: 'pre_seed', entityType: 'llc_corp', technologyType: 'therapeutic',
      jhuSchool: 'som', leadRole: 'faculty', jhtv: 'yes', licensing: 'gt12',
      siteMiner: 'no', siteMinerDays: '',
      marylandBased: 'yes', baltimoreArea: 'no',
      teamSize: 'founders_only', dilutive: '0', sedi: 'none',
      stemCells: 'yes', diseaseArea: 'neuro',
      hasSbirPhaseI: 'yes',
    },
    expected: {
      mii:        'conditional', // JHU✓ disclosure✓ MD✓ but no siteMiner contact
      mii_joint:  'conditional', // siteMiner warn + USM partner warn
      mii_cf:     'conditional', // siteMiner warn (already conditional) + llc_corp✓
      bii:        'ineligible',  // MD✓ but Baltimore=no
      sbir_match: 'eligible',    // MD✓ hasSbirPhaseI=yes✓
      mscrf:      'eligible',    // stemCells=yes
      builder:    'ineligible',  // no SEDI
      inclusion:  'ineligible',  // no SEDI
      rbii:       'ineligible',  // not rural
      nih_sbir:   'eligible',
      nih_sttr:   'eligible',    // JHU✓ licensed gt12✓
      nsf_sbir:   'eligible',
      arpah:      'eligible',
      dod_sbir:   'eligible',    // stemCells=yes → biomedical pass
      darpa:      'eligible',    // stemCells=yes → BTO pass
      fda_cdc:    'eligible',
      doe_sbir:   'conditional', // isMedical
      barda:      'eligible',
      carbx:      'ineligible',  // neuro not AMR
      va_sbir:    'conditional', // healthtech not veterans
      coulter:    'eligible',    // JHU✓ SOM✓ (warn for non-device but no s change)
      mmf:        'conditional', // MD✓ JHU≠USM
      aha:        'ineligible',  // neuro not cardio
      alz:        'eligible',    // neuro✓
      mjff:       'eligible',    // neuro✓
      cfft:       'ineligible',  // neuro not cf
      wellcome:   'eligible',    // healthtech + neuro pass
      bwf:        'eligible',
    },
  },

  {
    name: 'VC-Backed Growth Stage Digital Health (NSF blocked)',
    data: {
      ventureStage: 'growth', entityType: 'llc_corp', technologyType: 'digital_health',
      jhuSchool: 'none', leadRole: 'external', jhtv: 'no', licensing: 'noip',
      siteMiner: 'no', siteMinerDays: '',
      marylandBased: 'no', baltimoreArea: '',
      teamSize: '6_15', dilutive: 'gt5m', sedi: 'none',
      stemCells: 'no', diseaseArea: 'cardio',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'ineligible',  // no JHU
      mii_joint:  'ineligible',  // no JHU
      mii_cf:     'ineligible',  // no JHU
      bii:        'ineligible',  // not MD
      sbir_match: 'ineligible',  // not MD
      mscrf:      'ineligible',
      builder:    'ineligible',  // not MD
      inclusion:  'ineligible',  // not MD
      rbii:       'ineligible',  // not rural
      nih_sbir:   'eligible',
      nih_sttr:   'eligible',    // warn about no JHU partner, no fail
      nsf_sbir:   'ineligible',  // VC majority ownership
      arpah:      'eligible',    // digital health = healthtech
      dod_sbir:   'eligible',    // warn only, no fail
      darpa:      'conditional', // digital health not in BTO therapeutic/bio scope
      fda_cdc:    'eligible',    // digital health / SaMD
      doe_sbir:   'eligible',    // warn only (non-medical, no conditional set)
      barda:      'ineligible',  // not medical countermeasures
      carbx:      'ineligible',
      va_sbir:    'conditional', // healthtech but not veterans
      coulter:    'ineligible',  // no JHU
      mmf:        'ineligible',  // not MD
      aha:        'eligible',    // cardio focus
      alz:        'ineligible',
      mjff:       'ineligible',
      cfft:       'ineligible',
      wellcome:   'eligible',
      bwf:        'ineligible',  // external role
    },
  },

  {
    name: 'Sole Proprietor SEDI CF (non-medical)',
    data: {
      ventureStage: 'seed', entityType: 'sole_prop', technologyType: 'non_medical',
      jhuSchool: 'none', leadRole: 'external', jhtv: 'no', licensing: 'noip',
      siteMiner: 'no', siteMinerDays: '',
      marylandBased: 'yes', baltimoreArea: 'no',
      teamSize: '1_5', dilutive: 'lt2m', sedi: 'sedi',
      stemCells: 'no', diseaseArea: 'cf',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'ineligible',  // no JHU
      mii_joint:  'ineligible',  // no JHU
      mii_cf:     'ineligible',  // no JHU
      bii:        'ineligible',  // MD✓ but Baltimore=no
      sbir_match: 'ineligible',  // MD✓ but no Phase I award
      mscrf:      'ineligible',
      builder:    'eligible',    // MD✓ SEDI✓ FTE✓
      inclusion:  'eligible',    // MD✓ SEDI✓ (lt2m warn only, no conditional)
      rbii:       'ineligible',  // not rural
      nih_sbir:   'conditional', // sole prop → warn+conditional
      nih_sttr:   'conditional', // sole prop → warn+conditional
      nsf_sbir:   'conditional', // sole prop → warn+conditional
      arpah:      'conditional', // sole prop → warn+conditional
      dod_sbir:   'conditional', // sole prop → warn+conditional
      darpa:      'conditional', // sole prop + non-BTO tech
      fda_cdc:    'conditional', // sole prop + non-health
      doe_sbir:   'conditional', // sole prop (non_medical fits DOE but entity is conditional)
      barda:      'ineligible',  // not medical
      carbx:      'ineligible',  // not therapeutic
      va_sbir:    'ineligible',  // not healthtech
      coulter:    'ineligible',  // no JHU
      mmf:        'conditional', // MD✓ no JHU
      aha:        'ineligible',  // CF not cardio
      alz:        'ineligible',
      mjff:       'ineligible',
      cfft:       'eligible',    // CF disease area matched
      wellcome:   'conditional', // not healthtech
      bwf:        'ineligible',  // external role
    },
  },

  {
    name: 'JHU WSE Device Researcher (Coulter fit, Baltimore)',
    data: {
      ventureStage: 'pre_seed', entityType: 'llc_corp', technologyType: 'device',
      jhuSchool: 'wse', leadRole: 'faculty', jhtv: 'yes', licensing: 'lt12',
      siteMiner: 'yes', siteMinerDays: '60',
      marylandBased: 'yes', baltimoreArea: 'yes',
      teamSize: '1_5', dilutive: '0', sedi: 'none',
      stemCells: 'no', diseaseArea: 'veterans',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'eligible',
      mii_joint:  'conditional', // JHU✓ disclosure✓ MD✓ siteMiner(60d)✓ → USM partner warn
      mii_cf:     'eligible',    // JHU✓ disclosure✓ MD✓ siteMiner✓ llc_corp✓
      bii:        'eligible',    // MD✓ Baltimore✓
      sbir_match: 'ineligible',  // MD✓ but no Phase I award
      mscrf:      'ineligible',
      builder:    'ineligible',  // no SEDI
      inclusion:  'ineligible',  // no SEDI
      rbii:       'ineligible',  // not rural
      nih_sbir:   'eligible',
      nih_sttr:   'eligible',
      nsf_sbir:   'eligible',
      arpah:      'eligible',
      dod_sbir:   'eligible',    // device + veterans
      darpa:      'conditional', // device not in BTO bio scope
      fda_cdc:    'eligible',    // device focus
      doe_sbir:   'conditional', // medical device = weak DOE fit
      barda:      'eligible',    // medical countermeasure device
      carbx:      'ineligible',  // not therapeutic
      va_sbir:    'eligible',    // veterans disease area = strong VA fit
      coulter:    'eligible',    // WSE✓ JHU✓ device✓
      mmf:        'conditional', // MD✓ JHU≠USM
      aha:        'ineligible',  // veterans not cardio
      alz:        'ineligible',
      mjff:       'ineligible',
      cfft:       'ineligible',
      wellcome:   'eligible',
      bwf:        'eligible',    // faculty + isMedical
    },
  },

  {
    name: "Non-MD Parkinson's Postdoc (MJFF focus)",
    data: {
      ventureStage: 'ideation', entityType: 'llc_corp', technologyType: 'therapeutic',
      jhuSchool: 'som', leadRole: 'postdoc', jhtv: 'no', licensing: 'unlicensed',
      siteMiner: 'no', siteMinerDays: '',
      marylandBased: 'no', baltimoreArea: '',
      teamSize: 'founders_only', dilutive: '0', sedi: 'none',
      stemCells: 'no', diseaseArea: 'neuro',
      hasSbirPhaseI: 'no',
    },
    expected: {
      mii:        'ineligible',  // JHU✓ but no JHTV disclosure → hard fail
      mii_joint:  'ineligible',  // no JHTV disclosure → hard fail
      mii_cf:     'ineligible',  // no JHTV disclosure → hard fail
      bii:        'ineligible',  // not MD
      sbir_match: 'ineligible',  // not MD
      mscrf:      'ineligible',
      builder:    'ineligible',  // not MD
      inclusion:  'ineligible',  // not MD
      rbii:       'ineligible',  // not rural
      nih_sbir:   'eligible',
      nih_sttr:   'eligible',    // JHU✓ but unlicensed→warn
      nsf_sbir:   'eligible',
      arpah:      'eligible',
      dod_sbir:   'eligible',
      darpa:      'eligible',    // therapeutic
      fda_cdc:    'eligible',
      doe_sbir:   'conditional', // isMedical
      barda:      'eligible',
      carbx:      'ineligible',  // neuro not AMR
      va_sbir:    'conditional', // healthtech not veterans
      coulter:    'eligible',    // JHU(SOM)✓ therapeutic✓ (no MD requirement for Coulter)
      mmf:        'ineligible',  // not MD
      aha:        'ineligible',
      alz:        'eligible',    // neuro✓
      mjff:       'eligible',    // neuro✓ therapeutic✓
      cfft:       'ineligible',
      wellcome:   'eligible',    // healthtech + neuro
      bwf:        'eligible',    // postdoc + medical + JHU
    },
  },
];

// ── Run tests ──────────────────────────────────────────────────────────────────
let totalTests = 0;
let totalFails = 0;
const bugs = [];

console.log('\n════════════════════════════════════════════════════════════════');
console.log('  JHTV Grant Eligibility Stress Test');
console.log('════════════════════════════════════════════════════════════════\n');

for (const persona of personas) {
  const results  = getGrants(persona.data);
  const resultMap = {};
  results.forEach(g => { resultMap[g.id] = g.s; });

  let personaFails = 0;
  const failDetails = [];

  for (const [grantId, expectedStatus] of Object.entries(persona.expected)) {
    totalTests++;
    const actual = resultMap[grantId] || 'MISSING';
    if (actual !== expectedStatus) {
      personaFails++;
      totalFails++;
      failDetails.push(`  ✗ ${grantId.padEnd(20)} expected: ${expectedStatus.padEnd(12)} got: ${actual}`);
      bugs.push({ persona: persona.name, grant: grantId, expected: expectedStatus, actual });
    }
  }

  const status = personaFails === 0 ? '✓ PASS' : `✗ FAIL (${personaFails} bugs)`;
  console.log(`${status.padEnd(18)} ${persona.name}`);
  if (failDetails.length) failDetails.forEach(f => console.log(f));
}

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  SUMMARY: ${totalTests - totalFails}/${totalTests} checks passed`);
if (totalFails > 0) {
  console.log(`  BUGS FOUND: ${totalFails}\n`);
  bugs.forEach(b => {
    console.log(`  → [${b.grant}] in "${b.persona}": expected ${b.expected}, got ${b.actual}`);
  });
} else {
  console.log('  All checks passed — logic is clean.');
}
console.log('════════════════════════════════════════════════════════════════\n');

process.exit(totalFails > 0 ? 1 : 0);
