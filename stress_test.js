// ── JHTV Grant Eligibility Stress Test ─────────────────────────────────────
// Extracts grant logic from HTML, runs 12 personas, reports pass/fail vs expected

// Mock getRadio from form data (DOM not available in Node)
let _radioState = {};
function getRadio(name) { return _radioState[name] || ''; }

function getGrants(d) {
  // Override radio reads with data fields
  _radioState['stemCells'] = d.stemCells || '';

  const grants = [];
  const hasJHU = d.jhuSchool && d.jhuSchool !== 'none';
  const isMD = d.mdRatio && parseFloat(d.mdRatio) > 0;
  const formalEntity = ['corporation','llc','partnership'].includes(d.entityType);
  const smallBiz = !d.headcount || parseInt(d.headcount) < 500;
  const isSEDI = ['sedi','both'].includes(d.sedi);
  const isRural = ['rural','both'].includes(d.sedi);
  const hasDisclosure = d.jhtv === 'yes';
  const isMedical = ['fda_therapeutic','fda_device'].includes(d.regPathway);
  const isTherapeutic = d.regPathway === 'fda_therapeutic';
  const isDevice = d.regPathway === 'fda_device';
  const notVCMajority = !['lt5m','gt5m'].includes(d.dilutive);

  // 1. MII
  { const r=[]; let s='eligible';
    if(hasJHU) r.push({t:'pass',x:'JHU confirmed'}); else {r.push({t:'fail',x:'No JHU'}); s='ineligible';}
    if(hasDisclosure) r.push({t:'pass',x:'Disclosure filed'}); else {r.push({t:'fail',x:'No disclosure'}); s='ineligible';}
    if(isMD) r.push({t:'pass',x:'MD presence'}); else {r.push({t:'warn',x:'No MD'}); if(s==='eligible') s='conditional';}
    grants.push({id:'mii',title:'MII',s,r}); }

  // 2. MSCRF
  { const r=[]; let s='eligible';
    const sc=getRadio('stemCells');
    if(sc==='yes') r.push({t:'pass',x:'Stem cells confirmed'});
    else if(sc==='no') {r.push({t:'fail',x:'No stem cells'}); s='ineligible';}
    else {r.push({t:'warn',x:'Stem cells unknown'}); s='conditional';}
    grants.push({id:'mscrf',title:'MSCRF',s,r}); }

  // 3. Builder Fund
  { const r=[]; let s='eligible';
    const hasFTE=d.headcount&&parseInt(d.headcount)>=1;
    if(isMD) r.push({t:'pass',x:'MD confirmed'}); else {r.push({t:'fail',x:'No MD'}); s='ineligible';}
    if(isSEDI) r.push({t:'pass',x:'SEDI confirmed'}); else {r.push({t:'fail',x:'No SEDI'}); s='ineligible';}
    if(hasFTE) r.push({t:'pass',x:'FTE confirmed'}); else {r.push({t:'warn',x:'No FTE'}); if(s==='eligible') s='conditional';}
    grants.push({id:'builder',title:'Builder Fund',s,r}); }

  // 4. Inclusion Fund
  { const r=[]; let s='eligible';
    if(isMD) r.push({t:'pass',x:'MD confirmed'}); else {r.push({t:'fail',x:'No MD'}); s='ineligible';}
    if(isSEDI) r.push({t:'pass',x:'SEDI confirmed'}); else {r.push({t:'fail',x:'No SEDI'}); s='ineligible';}
    grants.push({id:'inclusion',title:'Inclusion Fund',s,r}); }

  // 5. RBII
  { const r=[]; let s='eligible';
    if(isRural) r.push({t:'pass',x:'Rural confirmed'}); else {r.push({t:'fail',x:'Not rural'}); s='ineligible';}
    if(['0','lt150k'].includes(d.revenue)||!d.revenue) r.push({t:'pass',x:'Revenue ok'});
    else if(d.revenue==='gt1m') {r.push({t:'fail',x:'Revenue too high'}); s='ineligible';}
    if(d.headcount&&parseInt(d.headcount)<=15) r.push({t:'pass',x:'Headcount ok'});
    else if(d.headcount&&parseInt(d.headcount)>15) {r.push({t:'fail',x:'Too many employees'}); s='ineligible';}
    grants.push({id:'rbii',title:'RBII',s,r}); }

  // 6. NIH SBIR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else if(d.entityType==='sole_prop') {r.push({t:'warn',x:'Sole prop - verify'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'warn',x:'Unknown entity'}); if(s==='eligible') s='conditional';}
    if(smallBiz) r.push({t:'pass',x:'<500 employees'});
    else {r.push({t:'fail',x:'>500 employees'}); s='ineligible';}
    grants.push({id:'nih_sbir',title:'NIH SBIR',s,r}); }

  // 7. NIH STTR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    if(smallBiz) r.push({t:'pass',x:'<500 employees'});
    else {r.push({t:'fail',x:'>500 employees'}); s='ineligible';}
    if(hasJHU) r.push({t:'pass',x:'JHU as partner'});
    else r.push({t:'warn',x:'Need nonprofit partner'});
    grants.push({id:'nih_sttr',title:'NIH STTR',s,r}); }

  // 8. NSF SBIR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    if(smallBiz) r.push({t:'pass',x:'<500 employees'});
    if(notVCMajority) r.push({t:'pass',x:'Not majority VC'});
    else {r.push({t:'fail',x:'Majority VC-owned'}); s='ineligible';}
    grants.push({id:'nsf_sbir',title:'NSF SBIR',s,r}); }

  // 9. ARPA-H
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    if(smallBiz) r.push({t:'pass',x:'<500 employees'});
    else {r.push({t:'fail',x:'>500 employees'}); s='ineligible';}
    if(isMedical||d.regPathway==='digital_health') r.push({t:'pass',x:'Health pathway'});
    else {r.push({t:'warn',x:'Must be health-related'}); if(s==='eligible') s='conditional';}
    grants.push({id:'arpah',title:'ARPA-H',s,r}); }

  // 10. DOD SBIR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    grants.push({id:'dod_sbir',title:'DOD SBIR',s,r}); }

  // 11. DARPA BTO
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    if(smallBiz) r.push({t:'pass',x:'<500 employees'});
    else {r.push({t:'fail',x:'>500 employees'}); s='ineligible';}
    if(isTherapeutic||getRadio('stemCells')==='yes') r.push({t:'pass',x:'Bio platform'});
    else {r.push({t:'warn',x:'Check topic alignment'}); if(s==='eligible') s='conditional';}
    grants.push({id:'darpa',title:'DARPA BTO',s,r}); }

  // 12. FDA/CDC SBIR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    if(isDevice) r.push({t:'pass',x:'Device pathway'});
    else if(isTherapeutic) r.push({t:'pass',x:'Therapeutic pathway'});
    else if(d.regPathway==='digital_health') r.push({t:'pass',x:'Digital health'});
    else {r.push({t:'warn',x:'Confirm health alignment'}); if(s==='eligible') s='conditional';}
    grants.push({id:'fda_cdc',title:'FDA/CDC SBIR',s,r}); }

  // 13. DOE SBIR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    grants.push({id:'doe_sbir',title:'DOE SBIR',s,r}); }

  // 14. BARDA
  { const r=[]; let s='eligible';
    if(!formalEntity&&d.entityType==='unincorporated') {r.push({t:'fail',x:'No entity'}); s='ineligible';}
    if(isMedical) r.push({t:'pass',x:'Medical pathway'});
    else {r.push({t:'fail',x:'Must be medical'}); s='ineligible';}
    grants.push({id:'barda',title:'BARDA',s,r}); }

  // 15. CARB-X — 'other' is ineligible, only empty is conditional
  { const r=[]; let s='eligible';
    if(!isTherapeutic) {r.push({t:'fail',x:'Therapeutic required'}); s='ineligible';}
    else if(d.diseaseArea==='amr') r.push({t:'pass',x:'AMR + therapeutic confirmed'});
    else if(!d.diseaseArea) {r.push({t:'warn',x:'Confirm AMR relevance'}); s='conditional';}
    else {r.push({t:'fail',x:'Non-AMR disease out of scope'}); s='ineligible';}
    grants.push({id:'carbx',title:'CARB-X',s,r}); }

  // 16. VA SBIR
  { const r=[]; let s='eligible';
    if(formalEntity) r.push({t:'pass',x:'Entity ok'});
    else if(d.entityType==='unincorporated') {r.push({t:'fail',x:'Not incorporated'}); s='ineligible';}
    else {r.push({t:'warn',x:'Verify entity'}); if(s==='eligible') s='conditional';}
    if(d.diseaseArea==='veterans') r.push({t:'pass',x:'Veterans focus'});
    else if(isMedical||d.regPathway==='digital_health') {r.push({t:'warn',x:'Confirm VA topic alignment'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'fail',x:'Not veteran-health relevant'}); s='ineligible';}
    grants.push({id:'va_sbir',title:'VA SBIR',s,r}); }

  // 17. Coulter
  { const r=[]; let s='eligible';
    if(hasJHU) r.push({t:'pass',x:'JHU confirmed'});
    else {r.push({t:'fail',x:'JHU only'}); s='ineligible';}
    if(isDevice) r.push({t:'pass',x:'Device pathway'});
    else if(isTherapeutic) {r.push({t:'warn',x:'Device/diagnostics preferred'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'warn',x:'Device focus required'}); if(s==='eligible') s='conditional';}
    grants.push({id:'coulter',title:'Coulter',s,r}); }

  // 18. Bisciotti
  { const r=[]; let s='eligible';
    if(hasJHU) r.push({t:'pass',x:'JHU confirmed'});
    else {r.push({t:'fail',x:'JHU only'}); s='ineligible';}
    if(hasDisclosure) r.push({t:'pass',x:'Disclosure filed'});
    else {r.push({t:'warn',x:'Disclosure needed'}); if(s==='eligible') s='conditional';}
    grants.push({id:'bisciotti',title:'Bisciotti Fund',s,r}); }

  // 19. JHTV Internal
  { const r=[]; let s='eligible';
    if(hasJHU) r.push({t:'pass',x:'JHU confirmed'});
    else {r.push({t:'fail',x:'JHU only'}); s='ineligible';}
    if(hasDisclosure) r.push({t:'pass',x:'Disclosure filed'});
    else {r.push({t:'warn',x:'Disclosure needed'}); if(s==='eligible') s='conditional';}
    grants.push({id:'jhtv_internal',title:'JHTV Internal',s,r}); }

  // 20. Maryland Momentum Fund — always conditional (USM affiliation not captured by form)
  { const r=[]; let s='conditional';
    if(isMD) r.push({t:'pass',x:'MD confirmed'});
    else {r.push({t:'fail',x:'MD required'}); s='ineligible';}
    r.push({t:'warn',x:'USM affiliation required — confirm USM connection'});
    grants.push({id:'mmf',title:'MMF',s,r}); }

  // 21. AHA — 'other' = ineligible, empty = conditional
  { const r=[]; let s='eligible';
    if(d.diseaseArea==='cardio') r.push({t:'pass',x:'Cardio confirmed'});
    else if(!d.diseaseArea) {r.push({t:'warn',x:'Select disease area to confirm'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'fail',x:'Not cardio'}); s='ineligible';}
    grants.push({id:'aha',title:'AHA',s,r}); }

  // 22. Alzheimer's — 'other' = ineligible, empty = conditional
  { const r=[]; let s='eligible';
    if(d.diseaseArea==='neuro') r.push({t:'pass',x:'Neuro confirmed'});
    else if(!d.diseaseArea) {r.push({t:'warn',x:'Select disease area to confirm'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'fail',x:'Not neuro'}); s='ineligible';}
    grants.push({id:'alz',title:"Alzheimer's Assoc",s,r}); }

  // 23. MJFF — 'other' = ineligible, empty = conditional
  { const r=[]; let s='eligible';
    if(d.diseaseArea==='neuro') r.push({t:'pass',x:'Neuro confirmed'});
    else if(!d.diseaseArea) {r.push({t:'warn',x:'Select disease area to confirm'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'fail',x:'Not Parkinsons'}); s='ineligible';}
    grants.push({id:'mjff',title:'MJFF',s,r}); }

  // 24. CFFT
  { const r=[]; let s='eligible';
    if(d.diseaseArea==='cf') r.push({t:'pass',x:'CF confirmed'});
    else {r.push({t:'fail',x:'CF only'}); s='ineligible';}
    grants.push({id:'cfft',title:'CFFT',s,r}); }

  // 25. Wellcome Leap
  { const r=[]; let s='eligible';
    if(isMedical||d.regPathway==='digital_health') r.push({t:'pass',x:'Health pathway'});
    else {r.push({t:'warn',x:'Health focus needed'}); if(s==='eligible') s='conditional';}
    if(d.diseaseArea==='womens') r.push({t:'pass',x:'Womens health - active program'});
    grants.push({id:'wellcome',title:'Wellcome Leap',s,r}); }

  // 26. BWF
  { const r=[]; let s='eligible';
    if(['faculty','postdoc'].includes(d.leadRole)) r.push({t:'pass',x:'Academic PI'});
    else if(d.leadRole==='external') {r.push({t:'fail',x:'Academic PI required'}); s='ineligible';}
    else if(d.leadRole==='student') {r.push({t:'warn',x:'Faculty co-PI likely needed'}); if(s==='eligible') s='conditional';}
    else {r.push({t:'warn',x:'Confirm PI eligibility'}); if(s==='eligible') s='conditional';}
    if(isMedical) r.push({t:'pass',x:'Biomedical alignment'});
    else if(d.regPathway==='none') {r.push({t:'warn',x:'Non-medical may not qualify'}); if(s==='eligible') s='conditional';}
    grants.push({id:'bwf',title:'BWF',s,r}); }

  return grants;
}

// ── 12 Stress Test Personas ──────────────────────────────────────────────────

const personas = [

  { name: 'P1: Pre-incorporation Faculty Lab',
    desc: 'JHU SOM faculty, unincorporated, FDA therapeutic, no SEDI, not rural',
    data: { entityType:'unincorporated', headcount:'2', mdRatio:'100', leadRole:'faculty',
            jhtv:'yes', licensing:'unlicensed', jhuSchool:'som', sedi:'none',
            monthsOp:'6', revenue:'0', dilutive:'0',
            stemCells:'no', regPathway:'fda_therapeutic', subjects:'animal', diseaseArea:'other' },
    expected: {
      mii:'eligible',        // JHU, disclosure filed — MII is pre-company friendly
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'ineligible', // unincorporated
      nih_sttr:'ineligible', // unincorporated
      nsf_sbir:'ineligible', // unincorporated
      arpah:'ineligible',    // unincorporated
      dod_sbir:'ineligible', // unincorporated
      darpa:'ineligible',    // unincorporated
      fda_cdc:'ineligible',  // unincorporated
      doe_sbir:'ineligible', // unincorporated
      barda:'ineligible',    // unincorporated (and medical — but entity blocks first)
      carbx:'ineligible',    // therapeutic yes, but unincorporated entity
      va_sbir:'ineligible',  // unincorporated
      coulter:'conditional', // JHU SOM yes, but not device — therapeutic path
      bisciotti:'eligible',  // JHU + disclosure
      jhtv_internal:'eligible',// JHU + disclosure
      mmf:'conditional',     // MD yes, but JHU not USM
      aha:'ineligible',      // not cardio
      alz:'ineligible',     // disease area 'other' = not neuro — warn only
      mjff:'ineligible',    // disease area 'other' = not neuro — warn only
      cfft:'ineligible',     // not CF
      wellcome:'eligible',   // medical pathway, health focus
      bwf:'eligible',        // faculty + medical
    }
  },

  { name: 'P2: SEDI Founder, LLC, No JHU',
    desc: 'Non-JHU SEDI founder, Maryland-based LLC, FDA device, 4 employees',
    data: { entityType:'llc', headcount:'4', mdRatio:'100', leadRole:'external',
            jhtv:'no', licensing:'noip', jhuSchool:'none', sedi:'sedi',
            monthsOp:'12', revenue:'0', dilutive:'0',
            stemCells:'no', regPathway:'fda_device', subjects:'neither', diseaseArea:'cardio' },
    expected: {
      mii:'ineligible',      // no JHU
      mscrf:'ineligible',    // no stem cells
      builder:'eligible',    // MD + SEDI + FTE
      inclusion:'eligible',  // MD + SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',   // LLC, <500 emp
      nih_sttr:'eligible',   // LLC — but no JHU partner (warn)
      nsf_sbir:'eligible',   // LLC, not VC majority
      arpah:'eligible',      // LLC, medical device pathway
      dod_sbir:'eligible',   // LLC
      darpa:'conditional',   // LLC but not therapeutic/stem cell — warn
      fda_cdc:'eligible',    // device pathway
      doe_sbir:'eligible',   // LLC
      barda:'eligible',      // LLC + medical device
      carbx:'ineligible',    // not therapeutic
      va_sbir:'conditional', // medical but not veterans focus
      coulter:'ineligible',  // no JHU
      bisciotti:'ineligible',// no JHU
      jhtv_internal:'ineligible',// no JHU
      mmf:'conditional',     // MD present, USM not confirmed — always conditional
      aha:'eligible',        // cardio
      alz:'ineligible',      // not neuro
      mjff:'ineligible',     // not neuro
      cfft:'ineligible',     // not CF
      wellcome:'eligible',   // medical pathway
      bwf:'ineligible',      // external founder
    }
  },

  { name: 'P3: VC-Heavy Startup ($6M raised)',
    desc: 'JHU WSE spinout, C-Corp, $6M VC raised, FDA therapeutic',
    data: { entityType:'corporation', headcount:'8', mdRatio:'75', leadRole:'faculty',
            jhtv:'yes', licensing:'lt12', jhuSchool:'wse', sedi:'none',
            monthsOp:'24', revenue:'lt150k', dilutive:'gt5m',
            stemCells:'no', regPathway:'fda_therapeutic', subjects:'animal', diseaseArea:'cancer' },
    expected: {
      mii:'eligible',        // JHU + disclosure + MD
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',   // corp, <500
      nih_sttr:'eligible',   // corp + JHU partner
      nsf_sbir:'ineligible', // majority VC-owned (>$5M)
      arpah:'eligible',      // corp, medical
      dod_sbir:'eligible',   // corp
      darpa:'eligible',      // corp, therapeutic
      fda_cdc:'eligible',    // corp, therapeutic
      doe_sbir:'eligible',   // corp
      barda:'eligible',      // corp + medical
      carbx:'ineligible',    // not AMR-specific
      va_sbir:'conditional', // medical, not veterans
      coulter:'conditional', // JHU WSE but not device — therapeutic
      bisciotti:'eligible',  // JHU + disclosure
      jhtv_internal:'eligible',
      mmf:'conditional',     // MD + JHU not USM
      aha:'ineligible',      // not cardio
      alz:'ineligible',      // not neuro
      mjff:'ineligible',     // not neuro
      cfft:'ineligible',     // not CF
      wellcome:'eligible',   // medical pathway
      bwf:'eligible',        // faculty + medical
    }
  },

  { name: 'P4: Human Stem Cell Startup, Rural + SEDI',
    desc: 'JHU postdoc, LLC, rural MD, SEDI, human stem cells, FDA therapeutic',
    data: { entityType:'llc', headcount:'3', mdRatio:'100', leadRole:'postdoc',
            jhtv:'yes', licensing:'lt12', jhuSchool:'som', sedi:'both',
            monthsOp:'10', revenue:'0', dilutive:'0',
            stemCells:'yes', regPathway:'fda_therapeutic', subjects:'animal', diseaseArea:'other' },
    expected: {
      mii:'eligible',        // JHU + disclosure + MD
      mscrf:'eligible',      // stem cells = yes
      builder:'eligible',    // MD + SEDI + FTE
      inclusion:'eligible',  // MD + SEDI
      rbii:'eligible',       // rural + revenue ok + headcount ok
      nih_sbir:'eligible',   // LLC, <500
      nih_sttr:'eligible',   // LLC + JHU partner
      nsf_sbir:'eligible',   // LLC, not VC majority
      arpah:'eligible',      // LLC, medical
      dod_sbir:'eligible',   // LLC
      darpa:'eligible',      // LLC, therapeutic
      fda_cdc:'eligible',    // therapeutic
      doe_sbir:'eligible',   // LLC
      barda:'eligible',      // LLC + medical
      carbx:'ineligible',    // not AMR
      va_sbir:'conditional', // medical, not veterans
      coulter:'conditional', // JHU SOM yes, therapeutic not device
      bisciotti:'eligible',  // JHU + disclosure
      jhtv_internal:'eligible',
      mmf:'conditional',     // MD + JHU not USM
      aha:'ineligible',     // disease area 'other' = not cardio
      alz:'ineligible',     // disease area 'other' = not neuro
      mjff:'ineligible',    // disease area 'other' = not neuro
      cfft:'ineligible',     // not CF
      wellcome:'eligible',   // medical pathway
      bwf:'eligible',        // postdoc + medical
    }
  },

  { name: 'P5: External Founder, No JHU IP',
    desc: 'External founder, C-Corp, no JHU affiliation, no disclosure, digital health',
    data: { entityType:'corporation', headcount:'5', mdRatio:'60', leadRole:'external',
            jhtv:'no', licensing:'noip', jhuSchool:'none', sedi:'none',
            monthsOp:'18', revenue:'lt150k', dilutive:'lt500k',
            stemCells:'no', regPathway:'digital_health', subjects:'neither', diseaseArea:'other' },
    expected: {
      mii:'ineligible',      // no JHU
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',   // corp, <500, digital health
      nih_sttr:'eligible',   // corp — warns about no JHU partner
      nsf_sbir:'eligible',   // corp, not VC majority
      arpah:'eligible',      // corp, digital health = health pathway
      dod_sbir:'eligible',   // corp
      darpa:'conditional',   // corp, not therapeutic/stem cell
      fda_cdc:'eligible',    // digital health
      doe_sbir:'eligible',   // corp
      barda:'ineligible',    // digital health is not isMedical (fda_therapeutic or fda_device)
      carbx:'ineligible',    // not therapeutic
      va_sbir:'conditional', // medical-ish, not veterans
      coulter:'ineligible',  // no JHU
      bisciotti:'ineligible',// no JHU
      jhtv_internal:'ineligible',// no JHU
      mmf:'conditional',     // MD present but no JHU
      aha:'ineligible',     // disease area 'other' = not cardio
      alz:'ineligible',      // disease area 'other' = explicitly not neuro
      mjff:'ineligible',     // disease area 'other' = explicitly not neuro
      cfft:'ineligible',     // not CF
      wellcome:'eligible',   // digital health = health pathway
      bwf:'ineligible',      // external founder
    }
  },

  { name: 'P6: Over 500 Employees',
    desc: 'Large company, Corp, 520 employees, FDA device — should kill all SBIR',
    data: { entityType:'corporation', headcount:'520', mdRatio:'80', leadRole:'faculty',
            jhtv:'yes', licensing:'gt12', jhuSchool:'wse', sedi:'none',
            monthsOp:'60', revenue:'gt1m', dilutive:'gt5m',
            stemCells:'no', regPathway:'fda_device', subjects:'human', diseaseArea:'cardio' },
    expected: {
      mii:'eligible',        // JHU + disclosure + MD
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural (and >15 employees, >$1M revenue)
      nih_sbir:'ineligible', // >500 employees
      nih_sttr:'ineligible', // >500 employees — wait, STTR logic only checks formalEntity not headcount... BUG?
      nsf_sbir:'ineligible', // majority VC (>$5M) kills it, and >500
      arpah:'ineligible',    // >500 employees
      dod_sbir:'eligible',   // DOD SBIR — no explicit headcount check (BARDA-style contracts, not SBIR-gated)
      darpa:'ineligible',    // DARPA SBIR requires <500 employees — >500 should be ineligible
      fda_cdc:'eligible',    // FDA/CDC SBIR — no explicit headcount check in current logic
      doe_sbir:'eligible',   // DOE SBIR — no explicit headcount check in current logic
      barda:'eligible',      // BARDA is contracts not SBIR — no 500-emp limit
      carbx:'ineligible',    // not therapeutic
      va_sbir:'conditional', // medical, not veterans
      coulter:'eligible',    // JHU + device
      bisciotti:'eligible',  // JHU + disclosure
      jhtv_internal:'eligible',
      mmf:'conditional',     // MD + JHU not USM
      aha:'eligible',        // cardio
      alz:'ineligible',      // not neuro
      mjff:'ineligible',     // not neuro
      cfft:'ineligible',     // not CF
      wellcome:'eligible',   // medical
      bwf:'eligible',        // faculty + medical
    }
  },

  { name: 'P7: Parkinson\'s Therapeutic (Neuro)',
    desc: 'JHU faculty, LLC, Parkinson\'s drug, FDA therapeutic, 3 months old',
    data: { entityType:'llc', headcount:'2', mdRatio:'100', leadRole:'faculty',
            jhtv:'yes', licensing:'lt12', jhuSchool:'som', sedi:'none',
            monthsOp:'3', revenue:'0', dilutive:'0',
            stemCells:'no', regPathway:'fda_therapeutic', subjects:'animal', diseaseArea:'neuro' },
    expected: {
      mii:'eligible',
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',
      nih_sttr:'eligible',
      nsf_sbir:'eligible',
      arpah:'eligible',
      dod_sbir:'eligible',
      darpa:'eligible',      // therapeutic
      fda_cdc:'eligible',
      doe_sbir:'eligible',
      barda:'eligible',
      carbx:'ineligible',    // not AMR
      va_sbir:'conditional',
      coulter:'conditional', // JHU yes, but not device
      bisciotti:'eligible',
      jhtv_internal:'eligible',
      mmf:'conditional',
      aha:'ineligible',      // not cardio
      alz:'eligible',        // neuro = eligible for Alzheimer's Assoc (Parkinson's is neuro)
      mjff:'eligible',       // neuro = MJFF eligible
      cfft:'ineligible',
      wellcome:'eligible',
      bwf:'eligible',
    }
  },

  { name: 'P8: Sole Proprietor, Non-Medical',
    desc: 'Sole proprietor, no JHU, non-medical (computational biotools), 100% MD',
    data: { entityType:'sole_prop', headcount:'1', mdRatio:'100', leadRole:'external',
            jhtv:'no', licensing:'noip', jhuSchool:'none', sedi:'none',
            monthsOp:'8', revenue:'0', dilutive:'0',
            stemCells:'no', regPathway:'none', subjects:'neither', diseaseArea:'other' },
    expected: {
      mii:'ineligible',      // no JHU
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'conditional',// sole prop — conditional
      nih_sttr:'conditional',// sole prop
      nsf_sbir:'conditional',// sole prop
      arpah:'conditional',   // sole prop + non-medical = warn on both
      dod_sbir:'conditional',// sole prop
      darpa:'conditional',   // sole prop + non-bio
      fda_cdc:'conditional', // sole prop + non-medical
      doe_sbir:'conditional',// sole prop — may be best fit for non-medical biotools
      barda:'ineligible',    // non-medical
      carbx:'ineligible',    // not therapeutic
      va_sbir:'ineligible',  // non-medical, not veterans
      coulter:'ineligible',  // no JHU
      bisciotti:'ineligible',// no JHU
      jhtv_internal:'ineligible',
      mmf:'conditional',     // MD present, no JHU
      aha:'ineligible',     // disease area 'other' = not cardio
      alz:'ineligible',     // disease area 'other' = not neuro
      mjff:'ineligible',    // disease area 'other' = not neuro
      cfft:'ineligible',
      wellcome:'conditional',// non-medical — warn
      bwf:'ineligible',      // external founder
    }
  },

  { name: 'P9: CF Therapeutic Startup',
    desc: 'JHU postdoc, LLC, Cystic Fibrosis drug, FDA therapeutic',
    data: { entityType:'llc', headcount:'4', mdRatio:'100', leadRole:'postdoc',
            jhtv:'yes', licensing:'lt12', jhuSchool:'som', sedi:'none',
            monthsOp:'14', revenue:'0', dilutive:'lt500k',
            stemCells:'no', regPathway:'fda_therapeutic', subjects:'animal', diseaseArea:'cf' },
    expected: {
      mii:'eligible',
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',
      nih_sttr:'eligible',
      nsf_sbir:'eligible',
      arpah:'eligible',
      dod_sbir:'eligible',
      darpa:'eligible',
      fda_cdc:'eligible',
      doe_sbir:'eligible',
      barda:'eligible',
      carbx:'ineligible',    // CF is not AMR
      va_sbir:'conditional',
      coulter:'conditional', // JHU, but not device
      bisciotti:'eligible',
      jhtv_internal:'eligible',
      mmf:'conditional',
      aha:'ineligible',      // not cardio
      alz:'ineligible',      // not neuro
      mjff:'ineligible',     // not neuro
      cfft:'eligible',       // CF disease area
      wellcome:'eligible',
      bwf:'eligible',        // postdoc + medical
    }
  },

  { name: 'P10: AMR Startup (Antibiotic Resistance)',
    desc: 'JHU faculty, C-Corp, AMR antibacterial, FDA therapeutic, 20 months',
    data: { entityType:'corporation', headcount:'6', mdRatio:'100', leadRole:'faculty',
            jhtv:'yes', licensing:'lt12', jhuSchool:'wse', sedi:'none',
            monthsOp:'20', revenue:'0', dilutive:'lt500k',
            stemCells:'no', regPathway:'fda_therapeutic', subjects:'animal', diseaseArea:'amr' },
    expected: {
      mii:'eligible',
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',
      nih_sttr:'eligible',
      nsf_sbir:'eligible',
      arpah:'eligible',
      dod_sbir:'eligible',
      darpa:'eligible',
      fda_cdc:'eligible',
      doe_sbir:'eligible',
      barda:'eligible',      // AMR + medical = BARDA priority
      carbx:'eligible',      // therapeutic + AMR = CARB-X perfect fit
      va_sbir:'conditional',
      coulter:'conditional', // JHU, not device
      bisciotti:'eligible',
      jhtv_internal:'eligible',
      mmf:'conditional',
      aha:'ineligible',
      alz:'ineligible',
      mjff:'ineligible',
      cfft:'ineligible',
      wellcome:'eligible',
      bwf:'eligible',
    }
  },

  { name: 'P11: Women\'s Health Device, Student Founder',
    desc: 'JHU student, unincorporated, women\'s health device, no funding raised',
    data: { entityType:'unincorporated', headcount:'2', mdRatio:'100', leadRole:'student',
            jhtv:'yes', licensing:'unlicensed', jhuSchool:'wse', sedi:'none',
            monthsOp:'4', revenue:'0', dilutive:'0',
            stemCells:'no', regPathway:'fda_device', subjects:'neither', diseaseArea:'womens' },
    expected: {
      mii:'eligible',        // JHU + disclosure
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'ineligible', // unincorporated
      nih_sttr:'ineligible', // unincorporated
      nsf_sbir:'ineligible', // unincorporated
      arpah:'ineligible',    // unincorporated
      dod_sbir:'ineligible', // unincorporated
      darpa:'ineligible',    // unincorporated
      fda_cdc:'ineligible',  // unincorporated
      doe_sbir:'ineligible', // unincorporated
      barda:'ineligible',    // unincorporated — entity check fires before medical check
      carbx:'ineligible',    // not therapeutic
      va_sbir:'ineligible',  // unincorporated
      coulter:'eligible',    // JHU WSE + device = coulter fit
      bisciotti:'eligible',  // JHU + disclosure
      jhtv_internal:'eligible',
      mmf:'conditional',     // MD + no USM
      aha:'ineligible',      // not cardio
      alz:'ineligible',      // not neuro
      mjff:'ineligible',     // not neuro
      cfft:'ineligible',
      wellcome:'eligible',   // women's health + active program
      bwf:'conditional',     // student — faculty co-PI likely needed
    }
  },

  { name: 'P12: Veterans Health, No JHU, LLC',
    desc: 'External founder, LLC, veterans PTSD therapeutic, 30 months, $1.5M raised',
    data: { entityType:'llc', headcount:'7', mdRatio:'50', leadRole:'external',
            jhtv:'no', licensing:'noip', jhuSchool:'none', sedi:'none',
            monthsOp:'30', revenue:'lt150k', dilutive:'lt2m',
            stemCells:'no', regPathway:'fda_therapeutic', subjects:'human', diseaseArea:'veterans' },
    expected: {
      mii:'ineligible',      // no JHU
      mscrf:'ineligible',    // no stem cells
      builder:'ineligible',  // no SEDI
      inclusion:'ineligible',// no SEDI
      rbii:'ineligible',     // not rural
      nih_sbir:'eligible',
      nih_sttr:'eligible',   // warns about no JHU partner
      nsf_sbir:'eligible',   // <$5M dilutive
      arpah:'eligible',
      dod_sbir:'eligible',
      darpa:'eligible',      // therapeutic
      fda_cdc:'eligible',
      doe_sbir:'eligible',
      barda:'eligible',
      carbx:'ineligible',    // not AMR
      va_sbir:'eligible',    // veterans disease area = VA priority
      coulter:'ineligible',  // no JHU
      bisciotti:'ineligible',// no JHU
      jhtv_internal:'ineligible',
      mmf:'conditional',     // MD present, no JHU
      aha:'ineligible',      // not cardio
      alz:'ineligible',      // not neuro
      mjff:'ineligible',     // not neuro
      cfft:'ineligible',
      wellcome:'eligible',   // medical
      bwf:'ineligible',      // external founder
    }
  },

];

// ── Run Tests ─────────────────────────────────────────────────────────────────

let totalTests = 0;
let totalFails = 0;
const bugs = [];

console.log('\n════════════════════════════════════════════════════════════════');
console.log('  JHTV GRANT ELIGIBILITY — STRESS TEST RESULTS');
console.log('════════════════════════════════════════════════════════════════\n');

for (const persona of personas) {
  const results = getGrants(persona.data);
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
  console.log('  BUG LIST (for patching):');
  bugs.forEach(b => {
    console.log(`  → [${b.grant}] in "${b.persona}": expected ${b.expected}, got ${b.actual}`);
  });
} else {
  console.log('  All checks passed — logic is clean.');
}
console.log('════════════════════════════════════════════════════════════════\n');
