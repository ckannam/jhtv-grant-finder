// Core grant eligibility engine — shared code.
// Loaded by jhtv_grant_eligibility.html (script tag) and fetched cross-repo by
// the JHTV Second Brain (same GitHub Pages origin). Keep framework-free and
// browser/Node compatible. stress_test.js requires this file directly.

function getGrants(d) {
  const grants = [];
  const hasJHU        = d.jhuSchool && d.jhuSchool !== 'none';
  const isMD          = d.marylandBased === 'yes';
  const formalEntity  = ['llc_corp','partnership'].includes(d.entityType);
  const notYetFormed  = !d.entityType || d.entityType === 'none';
  const isSEDI        = ['sedi','both'].includes(d.sedi);
  const isRural       = ['rural','both'].includes(d.sedi);
  const hasDisclosure = d.jhtv === 'yes';
  const isTherapeutic = d.technologyType === 'therapeutic';
  const isDevice      = d.technologyType === 'device';
  const isDigitalHealth = d.technologyType === 'digital_health';
  const isMedical     = isTherapeutic || isDevice;
  const isHealthTech  = isMedical || isDigitalHealth;
  const notVCMajority = !['lt5m','gt5m'].includes(d.dilutive);
  const hasFTE        = d.teamSize && d.teamSize !== 'founders_only';
  const smallTeam     = !d.teamSize || ['founders_only','1_5','6_15'].includes(d.teamSize);
  const isEarlyStage  = !d.ventureStage || ['ideation','forming','pre_seed','seed'].includes(d.ventureStage);
  const isBaltimore   = d.baltimoreArea === 'yes';
  const hasSbirAward  = d.hasSbirPhaseI === 'yes';

  // ── 1. MII ─────────────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (hasJHU) r.push({t:'pass', x:'JHU school affiliation confirmed'});
    else { r.push({t:'fail', x:'Requires JHU institutional connection'}); s='ineligible'; }
    if (hasDisclosure) r.push({t:'pass', x:'JHTV invention disclosure filed — case number required'});
    else { r.push({t:'fail', x:'Technology must be formally disclosed to JHTV with a case number'}); s='ineligible'; }
    if (isMD) r.push({t:'pass', x:'Maryland principal place of business confirmed'});
    else if (d.marylandBased === 'planning') { r.push({t:'warn', x:'Maryland presence required — ensure principal office is established before applying'}); if(s==='eligible') s='conditional'; }
    else if (d.marylandBased === 'no') { r.push({t:'warn', x:'Maryland nexus required for MII — company must be based in Maryland'}); if(s==='eligible') s='conditional'; }
    if (d.siteMiner === 'yes') {
      const days = parseInt(d.siteMinerDays) || 0;
      if (days >= 30) r.push({t:'pass', x:`Site Miner engaged ${days} days ago — application window open`});
      else r.push({t:'warn', x:`Site Miner engaged ${days} days ago — 30-day engagement window recommended before submitting`});
    } else if (d.siteMiner === 'no') {
      r.push({t:'warn', x:'Contact a TEDCO Site Miner before applying — required step for MII'});
      if(s==='eligible') s='conditional';
    }
    grants.push({ id:'mii', title:'Maryland Innovation Initiative (MII)', org:'TEDCO / JHTV', cat:'Maryland', s, amount:'Up to $130K (JHU tech assessment)', deadline:'Quarterly: Jan 15 · Apr 15 · Jul 15 · Oct 15', tags:['tag-md','tag-jhu'], applyUrl:'https://www.tedcomd.com/funding/maryland-innovation-initiative', r });
  }

  // ── 1b. MII Joint ──────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (hasJHU) r.push({t:'pass', x:'JHU school affiliation confirmed'});
    else { r.push({t:'fail', x:'Requires JHU institutional connection'}); s='ineligible'; }
    if (hasDisclosure) r.push({t:'pass', x:'JHTV invention disclosure filed — case number required'});
    else { r.push({t:'fail', x:'Technology must be formally disclosed to JHTV with a case number'}); s='ineligible'; }
    if (isMD) r.push({t:'pass', x:'Maryland principal place of business confirmed'});
    else if (d.marylandBased === 'planning') { r.push({t:'warn', x:'Maryland presence required — ensure principal office is established before applying'}); if(s==='eligible') s='conditional'; }
    else if (d.marylandBased === 'no') { r.push({t:'warn', x:'Maryland nexus required for MII — company must be based in Maryland'}); if(s==='eligible') s='conditional'; }
    if (d.siteMiner === 'yes') {
      const days = parseInt(d.siteMinerDays) || 0;
      if (days >= 30) r.push({t:'pass', x:`Site Miner engaged ${days} days ago — application window open`});
      else r.push({t:'warn', x:`Site Miner engaged ${days} days ago — 30-day engagement window recommended before submitting`});
    } else if (d.siteMiner === 'no') {
      r.push({t:'warn', x:'Contact a TEDCO Site Miner before applying — required step for MII'});
      if(s==='eligible') s='conditional';
    }
    r.push({t:'warn', x:'Requires a co-applicant from another USM institution — confirm you have an identified USM partner'});
    if(s==='eligible') s='conditional';
    grants.push({ id:'mii_joint', title:'MII – Tech Assessment (Joint)', org:'TEDCO / JHTV', cat:'Maryland', s, amount:'Up to $180K', deadline:'Quarterly: Jan 15 · Apr 15 · Jul 15 · Oct 15', tags:['tag-md','tag-jhu'], applyUrl:'https://www.tedcomd.com/funding/maryland-innovation-initiative', r });
  }

  // ── 1c. MII Company Formation ──────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (hasJHU) r.push({t:'pass', x:'JHU school affiliation confirmed'});
    else { r.push({t:'fail', x:'Requires JHU institutional connection'}); s='ineligible'; }
    if (hasDisclosure) r.push({t:'pass', x:'JHTV invention disclosure filed — case number required'});
    else { r.push({t:'fail', x:'Technology must be formally disclosed to JHTV with a case number'}); s='ineligible'; }
    if (isMD) r.push({t:'pass', x:'Maryland principal place of business confirmed'});
    else if (d.marylandBased === 'planning') { r.push({t:'warn', x:'Maryland presence required — ensure principal office is established before applying'}); if(s==='eligible') s='conditional'; }
    else if (d.marylandBased === 'no') { r.push({t:'warn', x:'Maryland nexus required for MII — company must be based in Maryland'}); if(s==='eligible') s='conditional'; }
    if (d.siteMiner === 'yes') {
      const days = parseInt(d.siteMinerDays) || 0;
      if (days >= 30) r.push({t:'pass', x:`Site Miner engaged ${days} days ago — application window open`});
      else r.push({t:'warn', x:`Site Miner engaged ${days} days ago — 30-day engagement window recommended before submitting`});
    } else if (d.siteMiner === 'no') {
      r.push({t:'warn', x:'Contact a TEDCO Site Miner before applying — required step for MII'});
      if(s==='eligible') s='conditional';
    }
    if (d.entityType === 'llc_corp') r.push({t:'pass', x:'Company incorporated — eligible for Company Formation award track'});
    else if (notYetFormed) { r.push({t:'warn', x:'Company Formation award requires active entity formation — begin incorporation process'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'warn', x:'Confirm your entity structure qualifies for the Company Formation track'}); if(s==='eligible') s='conditional'; }
    grants.push({ id:'mii_cf', title:'MII – Company Formation', org:'TEDCO / JHTV', cat:'Maryland', s, amount:'Up to $300K', deadline:'Quarterly: Jan 15 · Apr 15 · Jul 15 · Oct 15', tags:['tag-md','tag-jhu'], applyUrl:'https://www.tedcomd.com/funding/maryland-innovation-initiative', r });
  }

  // ── 1d. Baltimore Innovation Initiative ───────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (isMD) {
      if (isBaltimore) r.push({t:'pass', x:'Baltimore City / County location confirmed — core BII requirement met'});
      else if (d.baltimoreArea === 'no') { r.push({t:'fail', x:'BII requires principal office in Baltimore City or Baltimore County'}); s='ineligible'; }
      else { r.push({t:'warn', x:'Confirm your company is located in Baltimore City or Baltimore County'}); if(s==='eligible') s='conditional'; }
    } else if (d.marylandBased === 'planning') {
      r.push({t:'warn', x:'Maryland presence required — company must be Baltimore City/County based for BII'}); if(s==='eligible') s='conditional';
    } else {
      r.push({t:'fail', x:'BII requires a Maryland-based company in Baltimore City or County'}); s='ineligible';
    }
    grants.push({ id:'bii', title:'Baltimore Innovation Initiative (BII)', org:'TEDCO', cat:'Maryland', s, amount:'~$50K average award', deadline:'Varies — check current BII RFA cycle', tags:['tag-md'], applyUrl:'https://www.tedcomd.com/funding/maryland-innovation-initiative/baltimore-innovation-initiative-bii', r });
  }

  // ── 1e. TEDCO SBIR/STTR Matching Funds ────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (isMD) r.push({t:'pass', x:'Maryland-based company — eligible for TEDCO state match'});
    else if (d.marylandBased === 'planning') { r.push({t:'warn', x:'Maryland presence required for TEDCO SBIR/STTR Match'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'fail', x:'Requires Maryland principal place of business'}); s='ineligible'; }
    if (hasSbirAward) r.push({t:'pass', x:'Active SBIR/STTR Phase I award confirmed — eligible for TEDCO match'});
    else if (d.hasSbirPhaseI === 'no') { r.push({t:'fail', x:'Requires an active federal SBIR/STTR Phase I award'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Must have an active federal SBIR/STTR Phase I award — confirm award status before applying'}); if(s==='eligible') s='conditional'; }
    grants.push({ id:'sbir_match', title:'TEDCO SBIR/STTR Matching Funds', org:'TEDCO', cat:'Maryland', s, amount:'$25K–$75K match', deadline:'Quarterly windows — check TEDCO site', tags:['tag-md'], applyUrl:'https://www.tedcomd.com/funding/federal-programs/sbirsttr-matching-funds', r });
  }

  // ── 2. MSCRF ───────────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (d.stemCells === 'yes') r.push({t:'pass', x:'Human stem cell platform — core MSCRF mandate met'});
    else if (d.stemCells === 'no') { r.push({t:'fail', x:'MSCRF exclusively funds human stem cell research'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Confirm whether your technology involves human stem cells'}); s='conditional'; }
    if (hasJHU) r.push({t:'pass', x:'JHU affiliation eligible under Validation / Commercialization tracks'});
    else r.push({t:'pass', x:'Maryland-based company or institution is eligible'});
    if (isTherapeutic) r.push({t:'pass', x:'Therapeutic pipeline present — MSCRF Clinical track available (requires 1:1 non-state match for clinical studies)'});
    grants.push({ id:'mscrf', title:'Maryland Stem Cell Research Fund (MSCRF)', org:'TEDCO / MD Stem Cell Research Commission', cat:'Maryland', s, amount:'Up to $4.7M/cycle across 7 program tracks', deadline:'FY26 Cycle 2 open · mscrf.org', tags:['tag-md'], applyUrl:'https://www.mscrf.org/funding-opportunities', r });
  }

  // ── 3. TEDCO Builder Fund ──────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (isMD) r.push({t:'pass', x:'Maryland principal place of business required — confirmed'});
    else { r.push({t:'fail', x:'Principal place of business must be in Maryland'}); s='ineligible'; }
    if (isSEDI) r.push({t:'pass', x:'50%+ founders demonstrate economic disadvantage — qualifies'});
    else { r.push({t:'fail', x:'At least 50% of founders must demonstrate social/economic disadvantage'}); s='ineligible'; }
    if (hasFTE) r.push({t:'pass', x:'At least 1 full-time team member confirmed'});
    else { r.push({t:'warn', x:'At least 1 full-time employee required — founders-only teams should hire or commit before applying'}); if(s==='eligible') s='conditional'; }
    grants.push({ id:'builder', title:'TEDCO Pre-Seed Builder Fund', org:'TEDCO Social Impact Funds', cat:'Maryland', s, amount:'Pre-seed equity investment', deadline:'Rolling · tedcomd.com/builderfund', tags:['tag-md'], applyUrl:'https://www.tedcomd.com/funding/social-impact-funds', r });
  }

  // ── 4. TEDCO Inclusion Fund ────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (isMD) r.push({t:'pass', x:'Maryland-based company qualifies'});
    else { r.push({t:'fail', x:'Company must be Maryland-based'}); s='ineligible'; }
    if (isSEDI) r.push({t:'pass', x:'30%+ ownership by SEDI individual(s) — qualifies'});
    else { r.push({t:'fail', x:'Requires 30%+ ownership and management control by SEDI individuals'}); s='ineligible'; }
    if (['0','lt500k'].includes(d.dilutive)) r.push({t:'pass', x:'Early-stage — targeting pre-seed/seed gap'});
    else if (d.dilutive) r.push({t:'warn', x:'Fund targets early gap — verify stage fit with TEDCO'});
    grants.push({ id:'inclusion', title:'TEDCO Inclusion Fund', org:'TEDCO Social Impact Funds', cat:'Maryland', s, amount:'Equity investment (early-stage)', deadline:'Rolling · tedcomd.com', tags:['tag-md'], applyUrl:'https://www.tedcomd.com/funding/social-impact-funds', r });
  }

  // ── 5. TEDCO Rural RBII ────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (isRural) r.push({t:'pass', x:'Rural Maryland qualifier confirmed'});
    else { r.push({t:'fail', x:'Company must be in rural Maryland (Rural Maryland Council definition)'}); s='ineligible'; }
    if (isEarlyStage) r.push({t:'pass', x:'Early-stage company — likely within $1M revenue cap'});
    else if (d.ventureStage === 'growth') { r.push({t:'warn', x:'Growth-stage companies may exceed $1M annual revenue cap — verify with TEDCO before applying'}); if(s==='eligible') s='conditional'; }
    if (smallTeam) r.push({t:'pass', x:'Team size within 15-employee limit'});
    else if (d.teamSize) { r.push({t:'fail', x:'Exceeds 15-employee limit for RBII'}); s='ineligible'; }
    r.push({t:'warn', x:'Must complete 90 days of RBII mentoring before applying for $25K pre-seed grant'});
    grants.push({ id:'rbii', title:'TEDCO Rural Business Innovation Initiative (RBII)', org:'TEDCO', cat:'Maryland', s, amount:'$25K pre-seed (after 90-day mentoring)', deadline:'Contact regional RBII mentor first · tedcomd.com', tags:['tag-md'], applyUrl:'https://www.tedcomd.com/resources/rural-business-innovation-initiative', r });
  }

  // ── 6. NIH SBIR Phase I ────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'Formal U.S. small business entity (LLC / Corp / Partnership)'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must incorporate as a legal entity before applying'}); s='ineligible'; }
    else if (d.entityType === 'sole_prop') { r.push({t:'warn', x:'Sole proprietors may qualify — verify with NIH program officer'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'warn', x:'Confirm entity eligibility with NIH program officer'}); if(s==='eligible') s='conditional'; }
    if (isHealthTech) r.push({t:'pass', x:'Health technology — aligns with NIH SBIR medical research priorities'});
    else if (d.technologyType === 'life_tools') r.push({t:'pass', x:'Life sciences tools eligible — check NIGMS, NHGRI, NIBIB topic areas'});
    else if (d.technologyType === 'synbio') r.push({t:'pass', x:'Biotech / synthetic biology eligible — NIGMS, NCI, and DARPA overlap topics available'});
    else if (d.technologyType === 'non_medical') r.push({t:'warn', x:'Non-medical platforms still eligible — confirm NIH topic alignment (NIGMS, NICHD, etc.)'});
    r.push({t:'pass', x:'✓ SBIR/STTR reauthorized April 13, 2026 — program active'});
    grants.push({ id:'nih_sbir', title:'NIH SBIR Phase I (R43)', org:'NIH / National Institutes of Health', cat:'Federal', s, amount:'Up to $323K Phase I · up to $2.15M Phase II', deadline:'Multiple IC deadlines · seed.nih.gov', tags:['tag-fed'], applyUrl:'https://grants.nih.gov/funding/activity-codes/R43', r });
  }

  // ── 7. NIH STTR Phase I ────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'Formal U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must incorporate as a legal entity before applying'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Confirm entity eligibility with NIH program officer'}); if(s==='eligible') s='conditional'; }
    if (hasJHU) r.push({t:'pass', x:'JHU serves as the required nonprofit research partner — strong structural fit for STTR'});
    else r.push({t:'warn', x:'STTR requires a formal subcontract with a nonprofit research institution (e.g. a university)'});
    if (['lt12','gt12'].includes(d.licensing)) r.push({t:'pass', x:'Licensed JHU technology strengthens IP chain for STTR'});
    else if (d.licensing === 'unlicensed') r.push({t:'warn', x:'Complete JHU licensing before submission for cleaner IP ownership'});
    if (isMedical) r.push({t:'pass', x:'Medical technology aligns with NIH STTR focus areas'});
    r.push({t:'pass', x:'✓ SBIR/STTR reauthorized April 13, 2026 — program active'});
    grants.push({ id:'nih_sttr', title:'NIH STTR Phase I (R41)', org:'NIH / National Institutes of Health', cat:'Federal', s, amount:'Up to $323K Phase I · up to $2.15M Phase II', deadline:'Multiple IC deadlines · seed.nih.gov', tags:['tag-fed'], applyUrl:'https://grants.nih.gov/funding/activity-codes/R41', r });
  }

  // ── 8. NSF SBIR/STTR ──────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must form a legal entity'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Verify entity eligibility'}); if(s==='eligible') s='conditional'; }
    if (notVCMajority) r.push({t:'pass', x:'Not majority VC/PE-owned — meets NSF equity ownership requirement'});
    else { r.push({t:'fail', x:'NSF does not fund companies majority-owned by VC/PE/hedge funds'}); s='ineligible'; }
    if (isHealthTech || d.technologyType === 'life_tools' || d.technologyType === 'synbio') r.push({t:'pass', x:'Health, biotech, or life sciences technology — core NSF SBIR topic area'});
    else if (d.technologyType === 'non_medical') r.push({t:'warn', x:'Non-medical platforms are eligible if they have strong commercial potential — confirm topic fit'});
    r.push({t:'pass', x:'Project Pitches open June 2, 2026 · seedfund.nsf.gov'});
    grants.push({ id:'nsf_sbir', title:'NSF SBIR / STTR Phase I', org:'National Science Foundation', cat:'Federal', s, amount:'Up to $305K Phase I · up to $1.25M Phase II', deadline:'Project Pitch: rolling · seedfund.nsf.gov', tags:['tag-fed'], applyUrl:'https://seedfund.nsf.gov/apply/get-started/', r });
  }

  // ── 9. ARPA-H SBIR/STTR ───────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must incorporate as a legal entity before applying'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Confirm entity eligibility'}); if(s==='eligible') s='conditional'; }
    if (isHealthTech) r.push({t:'pass', x:'Health technology matches ARPA-H mandate (diagnostics, therapeutics, devices, digital health, women\'s health, synthetic bio)'});
    else { r.push({t:'warn', x:'ARPA-H exclusively funds health-related research — verify topic alignment'}); if(s==='eligible') s='conditional'; }
    r.push({t:'warn', x:'Current topics: women\'s health, autoimmune, diagnostics, synthetic biology, endometriosis, neurosurgical robotics'});
    r.push({t:'warn', x:'⏰ Deadline: Solution Summaries due July 10, 2026 — arpa-h.gov/explore-funding/sbir'});
    grants.push({ id:'arpah', title:'ARPA-H SBIR / STTR', org:'Advanced Research Projects Agency for Health (HHS)', cat:'Federal', s, amount:'Up to $600K Phase I · up to $3.5M Phase II', deadline:'July 10, 2026 · arpa-h.gov/explore-funding/sbir', tags:['tag-fed'], applyUrl:'https://arpa-h.gov/explore-funding/sbir', r });
  }

  // ── 10. DOD SBIR ──────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must form a legal entity'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Verify entity eligibility'}); if(s==='eligible') s='conditional'; }
    if (isMedical || d.stemCells === 'yes') r.push({t:'pass', x:'Biomedical / biotech platforms align with Army, Navy, MRMC, USAMRIID topic areas'});
    else r.push({t:'warn', x:'Review component-specific solicitations for topic alignment'});
    if (d.diseaseArea === 'veterans') r.push({t:'pass', x:'Veterans / military medicine focus strongly aligns with DOD priorities'});
    if (d.diseaseArea === 'amr') r.push({t:'pass', x:'AMR / infectious disease is a DOD biodefense priority'});
    r.push({t:'pass', x:'Largest SBIR funder — $1.8B+ annually across Army, Navy, Air Force, DARPA, MDA, SOCOM, DTRA'});
    grants.push({ id:'dod_sbir', title:'DOD SBIR / STTR', org:'U.S. Department of Defense', cat:'Federal', s, amount:'Up to $275K Phase I · up to $1.5M+ Phase II', deadline:'Component-specific · defensesbirsttr.mil', tags:['tag-fed'], applyUrl:'https://www.dodsbirsttr.mil/', r });
  }

  // ── 11. DARPA BTO ─────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business qualifies for DARPA SBIR topics'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must form a legal entity'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Confirm entity structure'}); if(s==='eligible') s='conditional'; }
    if (isTherapeutic || d.stemCells === 'yes' || d.technologyType === 'synbio') r.push({t:'pass', x:'Biological Technologies Office — most active DARPA SBIR shop in FY25/26'});
    else { r.push({t:'warn', x:'Check DARPA BTO topic alignment — defense-relevant biological platforms prioritized'}); if(s==='eligible') s='conditional'; }
    r.push({t:'warn', x:'Active topics: SWIFT, BARK (veterinary therapeutics), EXPOSITION, PEPI — defensesbirsttr.mil'});
    r.push({t:'warn', x:'DARPA requires clear defense relevance and breakthrough-level innovation'});
    grants.push({ id:'darpa', title:'DARPA Biological Technologies Office (BTO) SBIR', org:'DARPA / DOD', cat:'Federal', s, amount:'Variable · often $500K–$2M+ Phase I', deadline:'Topic-specific · defensesbirsttr.mil', tags:['tag-fed'], applyUrl:'https://www.darpa.mil/work-with-us/communities/small-business/sbir-sttr-topics', r });
  }

  // ── 12. FDA/CDC Joint SBIR ────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must form a legal entity'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Confirm entity eligibility'}); if(s==='eligible') s='conditional'; }
    if (isDevice) r.push({t:'pass', x:'Medical device / diagnostic pathway — FDA SBIR funds devices, diagnostics, and regulatory science'});
    else if (isTherapeutic) r.push({t:'pass', x:'Therapeutic development aligns with FDA/CDC public health mandate'});
    else if (isDigitalHealth) r.push({t:'pass', x:'Digital health / SaMD within FDA regulatory scope'});
    else { r.push({t:'warn', x:'FDA/CDC SBIR focuses on regulated health products — confirm topic alignment'}); if(s==='eligible') s='conditional'; }
    if (d.diseaseArea === 'amr') r.push({t:'pass', x:'AMR is a CDC/FDA priority area with dedicated SBIR topics'});
    r.push({t:'pass', x:'Joint NIH/CDC/FDA NOFO — single application covers multiple agencies'});
    grants.push({ id:'fda_cdc', title:'FDA / CDC Joint SBIR (R43/R44)', org:'FDA + CDC (via NIH portal)', cat:'Federal', s, amount:'Up to $323K Phase I · up to $2.15M Phase II', deadline:'seed.nih.gov — check joint NOFO', tags:['tag-fed'], applyUrl:'https://seed.nih.gov/small-business-funding/find-funding/sbir-sttr-funding-opportunities', r });
  }

  // ── 13. DOE SBIR ──────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must form a legal entity'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Verify entity eligibility'}); if(s==='eligible') s='conditional'; }
    if (d.technologyType === 'synbio') r.push({t:'pass', x:'Synthetic biology / industrial bio — strong fit for DOE BER and ARPA-E topics'});
    else if (d.technologyType === 'non_medical') r.push({t:'pass', x:'Non-medical / computational biotech — core fit for DOE topics (energy, climate, biosensors)'});
    else if (d.technologyType === 'life_tools') r.push({t:'pass', x:'Life sciences tools / biomanufacturing platforms align with DOE BER scope'});
    else if (isMedical) { r.push({t:'warn', x:'DOE SBIR funds energy-adjacent biotech — medical-only platforms are a weaker fit; check for dual-use or biosensor applications'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'warn', x:'DOE SBIR funds synthetic biology, biomanufacturing, biosensors, and computational biology — confirm topic alignment'}); }
    r.push({t:'pass', x:'✓ DOE SBIR/STTR reauthorized April 13, 2026 — now managed by DOE Office of Technology Commercialization (OTC)'});
    grants.push({ id:'doe_sbir', title:'DOE SBIR / STTR', org:'U.S. Department of Energy', cat:'Federal', s, amount:'Up to $323K Phase I', deadline:'science.osti.gov/sbir', tags:['tag-fed'], applyUrl:'https://www.energy.gov/technologycommercialization/doe-small-business-innovation-research-sbir-and-small-business', r });
  }

  // ── 14. BARDA / DRIVe ─────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (notYetFormed) { r.push({t:'fail', x:'Must have a legal entity to contract with BARDA'}); s='ineligible'; }
    if (isMedical) r.push({t:'pass', x:'Medical technology aligns with BARDA\'s medical countermeasure mandate'});
    else { r.push({t:'fail', x:'BARDA exclusively funds medical countermeasures and health security — non-medical technologies are ineligible'}); s='ineligible'; }
    if (d.diseaseArea === 'amr') r.push({t:'pass', x:'AMR is a top BARDA priority — strongest fit for this program'});
    r.push({t:'warn', x:'BARDA typically funds Phase 2+ assets; BARDA DRIVe targets earlier innovation stage'});
    r.push({t:'warn', x:'Priority areas: biodefense, pandemic preparedness, CBRN threats, AMR'});
    grants.push({ id:'barda', title:'BARDA / BARDA DRIVe', org:'Biomedical Advanced Research & Development Authority (HHS)', cat:'Federal', s, amount:'Contracts: $1M–$100M+ (stage-dependent)', deadline:'Rolling BAAs · medicalcountermeasures.gov', tags:['tag-fed'], applyUrl:'https://medicalcountermeasures.gov/barda/barda-baa', r });
  }

  // ── 15. CARB-X ────────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (!isTherapeutic) { r.push({t:'fail', x:'CARB-X funds novel antibacterial/antifungal development only — therapeutic pipeline required'}); s='ineligible'; }
    else if (d.diseaseArea === 'amr') { r.push({t:'pass', x:'AMR focus — perfect alignment with CARB-X mandate'}); r.push({t:'pass', x:'Therapeutic pipeline confirmed'}); }
    else if (!d.diseaseArea) { r.push({t:'warn', x:'Therapeutic pipeline present — CARB-X is exclusively AMR/antibacterial. Select a Disease Area to confirm scope'}); s='conditional'; }
    else { r.push({t:'fail', x:'CARB-X exclusively funds antibacterial/antifungal R&D — your indicated disease area is out of scope'}); s='ineligible'; }
    r.push({t:'warn', x:'Priority: first-in-class compounds with novel mechanisms targeting WHO priority pathogens'});
    r.push({t:'warn', x:'Q4 2026 funding round expected · CARB-X Novel Chemistry for AMR Challenge open · carb-x.org'});
    grants.push({ id:'carbx', title:'CARB-X (AMR Antimicrobial Accelerator)', org:'BARDA + Wellcome + NIAID', cat:'Federal', s, amount:'Up to $2M Phase 1 · up to $10M total portfolio', deadline:'Q4 2026 round expected · carb-x.org', tags:['tag-fed'], applyUrl:'https://carb-x.org/apply/', r });
  }

  // ── 16. VA SBIR ───────────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (formalEntity) r.push({t:'pass', x:'U.S. small business entity qualifies'});
    else if (notYetFormed) { r.push({t:'fail', x:'Must form a legal entity'}); s='ineligible'; }
    else { r.push({t:'warn', x:'Verify entity eligibility'}); if(s==='eligible') s='conditional'; }
    if (d.diseaseArea === 'veterans') r.push({t:'pass', x:'Veterans health focus — strongest alignment with VA SBIR priorities (PTSD, TBI, prosthetics, rehabilitation)'});
    else if (isHealthTech) { r.push({t:'warn', x:'VA SBIR focuses on veteran-relevant conditions (PTSD, TBI, mobility, chronic pain) — confirm alignment with VA research priorities'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'fail', x:'VA SBIR restricted to veteran health-relevant technologies'}); s='ineligible'; }
    grants.push({ id:'va_sbir', title:'VA SBIR / STTR', org:'U.S. Department of Veterans Affairs', cat:'Federal', s, amount:'Up to $275K Phase I', deadline:'sbir.gov/agencies/VA', tags:['tag-fed'], applyUrl:'https://www.sbir.gov', r });
  }

  // ── 17. JHU-Coulter Translational Partnership ─────────────────────────
  {
    const r = []; let s = 'eligible';
    const isWSEorSOM = ['wse','som'].includes(d.jhuSchool);
    if (hasJHU) r.push({t:'pass', x:'JHU affiliation confirmed'});
    else { r.push({t:'fail', x:'Exclusively for JHU researchers (Biomedical Engineering + School of Medicine)'}); s='ineligible'; }
    if (isWSEorSOM) r.push({t:'pass', x:'WSE / SOM affiliation — core Coulter program schools'});
    else if (hasJHU) r.push({t:'warn', x:'Program led by BME/WSE and SOM — other JHU schools may participate as co-investigators'});
    if (isDevice) r.push({t:'pass', x:'Medical device / diagnostic technology — Coulter explicitly targets device and diagnostic innovations'});
    else if (isTherapeutic) r.push({t:'warn', x:'Program historically device/diagnostics focused — therapeutics may qualify but verify with program office'});
    else { r.push({t:'warn', x:'Coulter Partnership targets device and diagnostic technologies with a clear clinical translational path'}); if(s==='eligible') s='conditional'; }
    r.push({t:'warn', x:'Requires joint PI team: clinician (SOM) + engineering faculty (WSE/BME) — lone investigator teams ineligible'});
    grants.push({ id:'coulter', title:'JHU-Coulter Translational Partnership', org:'Wallace H. Coulter Foundation / JHU BME', cat:'JHU/Private', s, amount:'Translational seed grants per project', deadline:'Annual cycle · cbid.bme.jhu.edu', tags:['tag-jhu'], applyUrl:'https://cbid.bme.jhu.edu/partners/johns-hopkins-coulter-translational-partnership/', r });
  }

  // ── 18. Maryland Momentum Fund ────────────────────────────────────────
  {
    const r = []; let s = 'conditional'; // always conditional — USM affiliation not confirmed by this form
    if (isMD) r.push({t:'pass', x:'Maryland-based company required — confirmed'});
    else { r.push({t:'fail', x:'Company must be Maryland-based'}); s='ineligible'; }
    r.push({t:'warn', x:'⚠ MMF requires University System of Maryland (USM) affiliation — JHU is private and NOT a USM member. Verify you have a USM (UMD, UMBC, UMB, Morgan State, Towson, etc.) co-founder, faculty collaborator, or institutional connection'});
    if (hasJHU) r.push({t:'warn', x:'JHU founders: check if a USM co-inventor, licensed USM technology, or USM research collaboration exists — that may establish eligibility'});
    else r.push({t:'warn', x:'Non-JHU Maryland company: confirm USM institutional connection to establish eligibility'});
    r.push({t:'pass', x:'$150K–$500K equity investment for early-stage tech companies'});
    grants.push({ id:'mmf', title:'Maryland Momentum Fund (MMF)', org:'University System of Maryland', cat:'Maryland', s, amount:'$150K – $500K equity', deadline:'Rolling · momentum.usmd.edu', tags:['tag-md'], applyUrl:'https://momentum.usmd.edu/steps-for-funding/application', r });
  }

  // ── 21. American Heart Association ────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (d.diseaseArea === 'cardio') r.push({t:'pass', x:'Cardiovascular / stroke focus — directly in scope for AHA funding'});
    else if (!d.diseaseArea) { r.push({t:'warn', x:'AHA funds cardiovascular / cerebrovascular research — select a Disease Area to confirm eligibility'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'fail', x:'AHA exclusively funds cardiovascular / cerebrovascular science'}); s='ineligible'; }
    if (isMedical) r.push({t:'pass', x:'Therapeutic or device pathway aligns with AHA translational grant priorities'});
    r.push({t:'warn', x:'AHA Transformational Project Award: up to $770K over 4 years. Predoctoral, postdoc, and career development awards also available'});
    grants.push({ id:'aha', title:'American Heart Association (AHA) Research Grants', org:'American Heart Association', cat:'Disease Foundation', s, amount:'$77K–$770K depending on mechanism', deadline:'Rolling cycles · heart.org/en/professional/research', tags:['tag-disease','tag-priv'], applyUrl:'https://professional.heart.org/en/research-programs/aha-funding-opportunities', r });
  }

  // ── 22. Alzheimer's Association ───────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (d.diseaseArea === 'neuro') r.push({t:'pass', x:'Neurodegenerative focus — Alzheimer\'s / dementia research directly in scope'});
    else if (!d.diseaseArea) { r.push({t:'warn', x:'Alzheimer\'s Association funds Alzheimer\'s and dementia research — select a Disease Area to confirm'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'fail', x:'Alzheimer\'s Association restricted to Alzheimer\'s and related dementias'}); s='ineligible'; }
    if (isTherapeutic) r.push({t:'pass', x:'Therapeutic drug / biologics development aligns with AARG and PIA grant mechanisms'});
    r.push({t:'warn', x:'Part the Cloud Translational grants: up to $600K for translational projects targeting disease modification'});
    grants.push({ id:'alz', title:"Alzheimer's Association Research Grants", org:"Alzheimer's Association", cat:'Disease Foundation', s, amount:'$200K–$600K (mechanism-dependent)', deadline:'Annual cycles · alz.org/research/for_researchers', tags:['tag-disease','tag-priv'], applyUrl:'https://www.alz.org/research/for_researchers/grants', r });
  }

  // ── 23. Michael J. Fox Foundation (MJFF) ─────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (d.diseaseArea === 'neuro') r.push({t:'pass', x:'Neurodegenerative focus — Parkinson\'s disease directly in scope for MJFF'});
    else if (!d.diseaseArea) { r.push({t:'warn', x:'MJFF exclusively funds Parkinson\'s disease research — select a Disease Area to confirm'}); if(s==='eligible') s='conditional'; }
    else { r.push({t:'fail', x:'MJFF restricted to Parkinson\'s disease therapeutics and biomarkers'}); s='ineligible'; }
    if (isTherapeutic) r.push({t:'pass', x:'Therapeutics Pipeline Program: pre-clinical to early clinical Parkinson\'s assets'});
    r.push({t:'warn', x:'Strong commercialization narrative required alongside scientific rationale'});
    r.push({t:'pass', x:'$250K–$2M+ · rolling pre-proposal deadlines · michaeljfox.org/grants'});
    grants.push({ id:'mjff', title:'Michael J. Fox Foundation (MJFF) Therapeutics Pipeline', org:'Michael J. Fox Foundation for Parkinson\'s Research', cat:'Disease Foundation', s, amount:'$250K – $2M+', deadline:'Rolling pre-proposals · michaeljfox.org/grants', tags:['tag-disease','tag-priv'], applyUrl:'https://www.michaeljfox.org/funding-opportunities', r });
  }

  // ── 24. Cystic Fibrosis Foundation Therapeutics (CFFT) ───────────────
  {
    const r = []; let s = 'eligible';
    if (d.diseaseArea === 'cf') r.push({t:'pass', x:'Cystic fibrosis focus — directly in scope for CFFT funding'});
    else { r.push({t:'fail', x:'CFFT restricted to cystic fibrosis therapeutics and related rare airway diseases'}); s='ineligible'; }
    if (isTherapeutic) r.push({t:'pass', x:'Therapeutics development — CFFT funds pre-clinical through Phase 2 assets'});
    r.push({t:'pass', x:'CFFT is one of the most active disease foundation funders — contracts, not grants, with milestone payments'});
    grants.push({ id:'cfft', title:'Cystic Fibrosis Foundation Therapeutics (CFFT)', org:'Cystic Fibrosis Foundation', cat:'Disease Foundation', s, amount:'$1M–$25M+ (contract milestones)', deadline:'Rolling · cff.org/researchers', tags:['tag-disease','tag-priv'], applyUrl:'https://www.cff.org/researchers/how-we-fund-research', r });
  }

  // ── 25. Wellcome Leap ─────────────────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (isHealthTech) r.push({t:'pass', x:'Health technology aligns with Wellcome Leap\'s bold health program mandate'});
    else { r.push({t:'warn', x:'Wellcome Leap funds unconventional health breakthroughs — non-health platforms are unlikely to qualify'}); if(s==='eligible') s='conditional'; }
    if (d.diseaseArea === 'womens') r.push({t:'pass', x:'Women\'s health — $250M program active in 2026 (Wellcome + Pivotal Ventures partnership)'});
    if (d.diseaseArea === 'neuro') r.push({t:'pass', x:'Neuroscience / mental health aligns with Wellcome Leap Human Organs, Cells and AI programs'});
    r.push({t:'warn', x:'Wellcome Leap funds time-limited programs with defined milestones — not a traditional grant mechanism. Requires bold, field-changing ambition'});
    r.push({t:'warn', x:'Open programs vary — check wellcomeleap.org for current solicitations'});
    grants.push({ id:'wellcome', title:'Wellcome Leap Health Programs', org:'Wellcome Leap (UK/global)', cat:'Private Foundation', s, amount:'Program-dependent · $1M–$50M+ scale', deadline:'Program-specific · wellcomeleap.org', tags:['tag-priv'], applyUrl:'https://wellcomeleap.org', r });
  }

  // ── 26. Burroughs Wellcome Fund ───────────────────────────────────────
  {
    const r = []; let s = 'eligible';
    if (['faculty','postdoc'].includes(d.leadRole)) r.push({t:'pass', x:'Academic PI (faculty/postdoc) eligible for BWF career and translational awards'});
    else if (d.leadRole === 'external') { r.push({t:'fail', x:'BWF awards tied to academic/institutional affiliation — external-only founders not eligible'}); s='ineligible'; }
    else if (d.leadRole === 'student') { r.push({t:'warn', x:'Students may qualify for trainee awards — most translational mechanisms require faculty-level PI'}); if(s==='eligible') s='conditional'; }
    if (isMedical) r.push({t:'pass', x:'Biomedical research aligns with BWF Translational Research and CASI award mechanisms'});
    else if (d.technologyType === 'non_medical') { r.push({t:'warn', x:'BWF focuses on biomedical / life sciences — non-medical platforms may not qualify'}); if(s==='eligible') s='conditional'; }
    if (hasJHU) r.push({t:'pass', x:'JHU affiliation strengthens institutional track record for BWF review'});
    r.push({t:'warn', x:'CASI Award (Career Award at the Scientific Interface): $500K over 5 years for researchers bridging physical/computational and biological sciences'});
    grants.push({ id:'bwf', title:'Burroughs Wellcome Fund (BWF) Translational Awards', org:'Burroughs Wellcome Fund', cat:'Private Foundation', s, amount:'$500K – $2M (mechanism-dependent)', deadline:'Annual cycles · bwfund.org', tags:['tag-priv'], applyUrl:'https://www.bwfund.org/funding-opportunities/', r });
  }

  return grants;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getGrants };
