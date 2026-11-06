/**
 * popup.js — Tatkal Arm Tactile Controller & Apple Fluid Interface.
 */

'use strict';

/* ── DOM References ─────────────────────────────────────────────────── */

// Views & Navigation
const monitorView       = document.getElementById('monitorView');
const configView        = document.getElementById('configView');
const toggleConfigBtn   = document.getElementById('toggleConfigBtn');
const backToMonitorBtn  = document.getElementById('backToMonitorBtn');

// Login Bar
const autoLoginBtn      = document.getElementById('autoLoginBtn');
const signInSubmitBtn   = document.getElementById('signInSubmitBtn');
const quickUserId       = document.getElementById('quickUserId');
const quickPassword     = document.getElementById('quickPassword');

// Monitor View Elements
const countdownDigits   = document.getElementById('countdownDigits');
const clockSyncStatus   = document.getElementById('clockSyncStatus');
const targetHourLabel   = document.getElementById('targetHourLabel');
const targetBadge       = document.getElementById('targetBadge');
const activePageBadge   = document.getElementById('activePageBadge');
const fromCode          = document.getElementById('fromCode');
const toCode            = document.getElementById('toCode');
const travelDateVal     = document.getElementById('travelDateVal');
const classVal          = document.getElementById('classVal');
const trainVal          = document.getElementById('trainVal');
const paxCountVal       = document.getElementById('paxCountVal');
const statusDot         = document.getElementById('statusDot');
const statusTitle       = document.getElementById('statusTitle');
const statusSubtitle    = document.getElementById('statusSubtitle');
const timelineSection   = document.getElementById('timelineSection');
const timelineLog       = document.getElementById('timelineLog');
const elapsedTimer      = document.getElementById('elapsedTimer');

// 1-Click Operation Buttons
const btnActAutoFillPage = document.getElementById('btnActAutoFillPage');
const btnActTatkal      = document.getElementById('btnActTatkal');
const btnActClass       = document.getElementById('btnActClass');
const btnActClassLabel  = document.getElementById('btnActClassLabel');
const btnActPassengers  = document.getElementById('btnActPassengers');
const btnActPay         = document.getElementById('btnActPay');
const btnActJourney     = document.getElementById('btnActJourney');

// Primary Engine Actions
const armBtn            = document.getElementById('armBtn');
const runNowBtn         = document.getElementById('runNowBtn');
const stopBtn           = document.getElementById('stopBtn');

// Config View Form
const popupConfigForm   = document.getElementById('popupConfigForm');
const cfgBookingSite    = document.getElementById('cfgBookingSite');
const portalActiveTag   = document.getElementById('portalActiveTag');
const dashPortalPill    = document.getElementById('dashPortalPill');
const cfgUserId         = document.getElementById('cfgUserId');
const cfgPassword       = document.getElementById('cfgPassword');
const cfgDate           = document.getElementById('cfgDate');
const cfgFrom           = document.getElementById('cfgFrom');
const cfgTo             = document.getElementById('cfgTo');
const cfgClass          = document.getElementById('cfgClass');
const cfgTrain          = document.getElementById('cfgTrain');
const paxCardsContainer = document.getElementById('paxCardsContainer');
const btnAddPaxCard     = document.getElementById('btnAddPaxCard');
const cfgPaymentMethod  = document.getElementById('cfgPaymentMethod');
const cfgEwalletPin     = document.getElementById('cfgEwalletPin');
const cfgUpiId          = document.getElementById('cfgUpiId');
const cfgBankName       = document.getElementById('cfgBankName');
const cfgCardNumber     = document.getElementById('cfgCardNumber');
const cfgCardExpiry     = document.getElementById('cfgCardExpiry');
const cfgCardName       = document.getElementById('cfgCardName');
const cfgCardCvv        = document.getElementById('cfgCardCvv');
const cfgBookOnlyIfCnf  = document.getElementById('cfgBookOnlyIfCnf');
const wrapEwallet       = document.getElementById('wrapEwallet');
const wrapUpiId         = document.getElementById('wrapUpiId');
const wrapNetBanking    = document.getElementById('wrapNetBanking');
const wrapCardDetails   = document.getElementById('wrapCardDetails');
const paymentVal        = document.getElementById('paymentVal');
const btnActPayLabel    = document.getElementById('btnActPayLabel');
const btnActPaySub      = document.getElementById('btnActPaySub');
const cfgFallbackFrom   = document.getElementById('cfgFallbackFrom');
const cfgFallbackTo     = document.getElementById('cfgFallbackTo');
const cfgDryRun         = document.getElementById('cfgDryRun');

// Error Banner
const errorAlert        = document.getElementById('errorAlert');
const errorMessage      = document.getElementById('errorMessage');

let targetTime   = null;
let countdownId  = null;
let runStartTime = null;
let currentConfig = {};
let passengersList = [];

/* ── Lifecycle ──────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  await loadStateAndConfig();
  await checkActiveIRCTCPage();
  setInterval(checkActiveIRCTCPage, 1200);
});

/* ── Spatial Left/Right Transitions (Apple Symmetric Paths) ────────── */

toggleConfigBtn.addEventListener('click', () => {
  monitorView.className = 'view view-hidden-left';
  configView.className = 'view view-active';
  toggleConfigBtn.style.display = 'none';
});

backToMonitorBtn.addEventListener('click', () => {
  configView.className = 'view view-hidden';
  monitorView.className = 'view view-active';
  toggleConfigBtn.style.display = 'inline-flex';
  refreshMonitorSummary();
});

/* ── Page Detection (Real-Time Live Polling) ────────────────────────── */

async function checkActiveIRCTCPage() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'FORWARD_ACTION',
      payload: { type: 'CHECK_PAGE' }
    });
    if (res && res.success) {
      const portalLabel = res.portal === 'eticket' ? 'Beta' : (res.portal === 'nget' ? 'Classic' : '');
      const prefix = portalLabel ? `${portalLabel} • ` : '';

      if (res.isPassengerPage) {
        activePageBadge.textContent = `${prefix}Passenger Input`;
        activePageBadge.style.color = 'var(--lime)';
      } else if (res.isTrainListPage) {
        activePageBadge.textContent = `${prefix}Train Results`;
        activePageBadge.style.color = 'var(--lime)';
      } else if (res.isSearchPage) {
        activePageBadge.textContent = `${prefix}Train Search`;
        activePageBadge.style.color = 'var(--stone)';
      } else if (res.hasLoginModal) {
        activePageBadge.textContent = `${prefix}Login Modal`;
        activePageBadge.style.color = 'var(--lime)';
      } else {
        activePageBadge.textContent = `${prefix}Connected`;
        activePageBadge.style.color = 'var(--lime)';
      }
    } else {
      activePageBadge.textContent = 'Standby (Open IRCTC)';
      activePageBadge.style.color = 'var(--stone)';
    }
  } catch (_) {
    activePageBadge.textContent = 'Standby';
    activePageBadge.style.color = 'var(--stone)';
  }
}

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ── Load State & Config ────────────────────────────────────────────── */

function populateFormFromConfig(cfg, state) {
  currentConfig = cfg;

  // Sync Credentials
  const uid = cfg.userId || quickUserId.value || '';
  const pwd = cfg.password || quickPassword.value || '';

  quickUserId.value   = uid;
  quickPassword.value = pwd;
  cfgUserId.value     = uid;
  cfgPassword.value   = pwd;

  // Dual Portal Selection (Beta eticket vs Classic nget)
  const site = cfg.bookingSite || 'eticket';
  if (cfgBookingSite) cfgBookingSite.value = site;
  if (portalActiveTag) portalActiveTag.textContent = site === 'nget' ? 'Classic nget' : 'Beta eticket';
  if (dashPortalPill) dashPortalPill.textContent = site === 'nget' ? 'Classic • nget' : 'Beta • eticket';

  // Standard Tatkal is ALWAYS for Tomorrow!
  const todayISO = new Date().toISOString().slice(0, 10);
  const tomorrowISO = getTomorrowDateString();

  if (!cfg.travelDate || cfg.travelDate <= todayISO) {
    cfgDate.value = tomorrowISO;
    cfg.travelDate = tomorrowISO;
  } else {
    cfgDate.value = cfg.travelDate;
  }

  cfgFrom.value          = cfg.fromStation || '';
  cfgTo.value            = cfg.toStation || '';
  cfgClass.value         = cfg.journeyClass || 'SL';
  cfgTrain.value         = cfg.trainNumber || '';
  if (cfgPaymentMethod) cfgPaymentMethod.value = cfg.paymentMethod || 'ewallet';
  if (cfgEwalletPin)    cfgEwalletPin.value    = cfg.ewalletPin || '';
  if (cfgUpiId)         cfgUpiId.value         = cfg.upiId || '';
  if (cfgBankName)      cfgBankName.value      = cfg.bankName || 'SBI';
  if (cfgCardNumber)    cfgCardNumber.value    = cfg.cardNumber || '';
  if (cfgCardExpiry)    cfgCardExpiry.value    = cfg.cardExpiry || '';
  if (cfgCardName)      cfgCardName.value      = cfg.cardName || '';
  if (cfgCardCvv)       cfgCardCvv.value       = cfg.cardCvv || '';
  
  // Book only if confirmed berths allotted defaults to TRUE for Tatkal!
  if (cfgBookOnlyIfCnf) {
    cfgBookOnlyIfCnf.checked = cfg.bookOnlyIfCnf !== false;
  }

  cfgFallbackFrom.value  = cfg.fallbackFrom || '';
  cfgFallbackTo.value    = cfg.fallbackTo || '';
  cfgDryRun.checked      = cfg.dryRun === true;

  setPaymentMode(cfg.paymentMethod || 'ewallet');

  // Passenger list — leave age empty if new so user types their actual age
  passengersList = Array.isArray(cfg.passengers) && cfg.passengers.length > 0
    ? [...cfg.passengers]
    : [{ name: '', age: '', gender: 'M', nationality: 'IN', berthPreference: '' }];

  renderPassengerCards();

  // Populate Monitor
  refreshMonitorFromConfig(cfg, state);
}

async function loadStateAndConfig() {
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' }).catch(() => ({}));
  const creds = await chrome.storage.local.get(['config', 'tatkal_config', 'userId', 'password']);
  const cfg = creds.config || creds.tatkal_config || state?.config || {};

  if (creds.userId && !cfg.userId) cfg.userId = creds.userId;
  if (creds.password && !cfg.password) cfg.password = creds.password;

  populateFormFromConfig(cfg, state);

  // Armed state
  if (state?.armed && state?.targetTime) {
    targetTime = state.targetTime;
    setArmedUI(state.targetTime);
  } else {
    setIdleUI();
  }
}

function setPaymentMode(mode) {
  if (cfgPaymentMethod) cfgPaymentMethod.value = mode;

  // Update pills active styling
  document.querySelectorAll('.payment-mode-pill').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-mode') === mode);
  });

  // Toggle relevant field containers
  if (wrapEwallet)     wrapEwallet.style.display     = (mode === 'ewallet') ? 'block' : 'none';
  if (wrapUpiId)       wrapUpiId.style.display       = (mode === 'upi' || mode === 'ipay') ? 'block' : 'none';
  if (wrapNetBanking)  wrapNetBanking.style.display  = (mode === 'netbanking') ? 'block' : 'none';
  if (wrapCardDetails) wrapCardDetails.style.display = (mode === 'cards' || mode === 'ipay') ? 'block' : 'none';

  updatePaymentSummaryLabels(mode);
}

function updatePaymentSummaryLabels(mode) {
  if (paymentVal) {
    if (mode === 'ewallet') paymentVal.textContent = 'eWallet ⚡';
    else if (mode === 'ipay') paymentVal.textContent = 'iPay (UPI)';
    else if (mode === 'upi') paymentVal.textContent = 'BHIM UPI';
    else if (mode === 'cards') paymentVal.textContent = 'Card Pay';
    else if (mode === 'netbanking') paymentVal.textContent = (cfgBankName && cfgBankName.value) || 'NetBank';
    else paymentVal.textContent = 'eWallet ⚡';
  }

  if (btnActPayLabel && btnActPaySub) {
    if (mode === 'ewallet') {
      btnActPayLabel.textContent = 'Auto-Pay (eWallet)';
      btnActPaySub.textContent = 'Instant Booking ⚡';
    } else if (mode === 'ipay') {
      btnActPayLabel.textContent = 'Auto-Pay (iPay)';
      btnActPaySub.textContent = 'Direct Gateway';
    } else if (mode === 'upi') {
      btnActPayLabel.textContent = 'Auto-Pay (UPI)';
      btnActPaySub.textContent = 'Auto VPA Request';
    } else if (mode === 'cards') {
      btnActPayLabel.textContent = 'Auto-Pay (Cards)';
      btnActPaySub.textContent = 'Card Auto-Fill';
    } else if (mode === 'netbanking') {
      btnActPayLabel.textContent = 'Auto-Pay (NetBank)';
      btnActPaySub.textContent = 'Bank Auto-Select';
    }
  }
}

// Attach pill switcher click handlers
document.querySelectorAll('.payment-mode-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const mode = pill.getAttribute('data-mode');
    setPaymentMode(mode);
  });
});

if (cfgPaymentMethod) {
  cfgPaymentMethod.addEventListener('change', (e) => {
    setPaymentMode(e.target.value);
  });
}

if (cfgBookingSite) {
  cfgBookingSite.addEventListener('change', (e) => {
    const site = e.target.value;
    if (portalActiveTag) portalActiveTag.textContent = site === 'nget' ? 'Classic nget' : 'Beta eticket';
    if (dashPortalPill) dashPortalPill.textContent = site === 'nget' ? 'Classic • nget' : 'Beta • eticket';
  });
}

// Attach quick UPI suffix chips handlers
document.querySelectorAll('.btn-upi-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const suffix = btn.getAttribute('data-suffix');
    let cur = cfgUpiId.value.trim();
    if (cur.includes('@')) {
      cur = cur.split('@')[0];
    }
    if (!cur) cur = 'username';
    cfgUpiId.value = cur + suffix;
    cfgUpiId.focus();
  });
});

function refreshMonitorFromConfig(cfg, state) {
  fromCode.textContent = cfg.fromStation || '---';
  toCode.textContent   = cfg.toStation || '---';

  const dStr = cfg.travelDate || getTomorrowDateString();
  const [y, m, d] = dStr.split('-');
  const isTomorrow = dStr === getTomorrowDateString();
  travelDateVal.textContent = isTomorrow ? `${d}/${m} (Tomorrow)` : `${d}/${m}/${y}`;

  const cls = cfg.journeyClass || 'SL';
  const isAc = ['1A', '2A', '3A', 'CC', 'EC'].includes(cls);

  classVal.textContent = `${cls} (Tatkal)`;
  targetBadge.textContent = isAc ? '10:00 AM AC' : '11:00 AM Non-AC';
  targetHourLabel.textContent = `Opens ${isAc ? '10:00:00' : '11:00:00'} IST (T−0.5s)`;
  btnActClassLabel.textContent = `Click ${cls} Seats`;

  trainVal.textContent = cfg.trainNumber || 'Any Train';

  const paxCount = Array.isArray(cfg.passengers) ? cfg.passengers.length : 0;
  paxCountVal.textContent = paxCount > 0 ? `${paxCount} Pax` : '0 Pax';

  if (paymentVal) {
    const pm = cfg.paymentMethod || 'ewallet';
    if (pm === 'ewallet') paymentVal.textContent = 'eWallet ⚡';
    else if (pm === 'ipay') paymentVal.textContent = 'iPay (UPI)';
    else if (pm === 'upi') paymentVal.textContent = 'BHIM UPI';
    else if (pm === 'cards') paymentVal.textContent = 'Card Pay';
    else if (pm === 'netbanking') paymentVal.textContent = cfg.bankName || 'NetBank';
    else paymentVal.textContent = 'eWallet ⚡';
  }

  if (state && state.clockSynced) {
    clockSyncStatus.textContent = `Atomic Drift: ±${Math.abs(state.clockOffset)}ms`;
  } else {
    clockSyncStatus.textContent = 'Atomic Clock: Synced';
  }
}

async function refreshMonitorSummary() {
  const data = await chrome.storage.local.get('config');
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  refreshMonitorFromConfig(data.config || {}, state);
}

/* ── Apple Grouped Passenger Cards ──────────────────────────────────── */

function renderPassengerCards() {
  paxCardsContainer.innerHTML = '';
  passengersList.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'pax-item-card';
    card.innerHTML = `
      <div class="pax-item-header">
        <span>Passenger ${idx + 1}</span>
        ${passengersList.length > 1 ? `<button type="button" class="btn-delete-pax" data-idx="${idx}">Delete</button>` : ''}
      </div>
      <div class="grouped-field-row">
        <div class="grouped-field" style="flex:2">
          <label>Full Name</label>
          <input type="text" class="pax-input-name" data-idx="${idx}" value="${p.name || ''}" placeholder="Full Name as per Aadhaar / ID" spellcheck="false" required>
        </div>
        <div class="grouped-field" style="flex:1">
          <label>Age</label>
          <input type="number" class="pax-input-age" data-idx="${idx}" value="${p.age || ''}" placeholder="Age" min="1" max="120" required>
        </div>
      </div>
      <div class="group-divider"></div>
      <div class="grouped-field-row">
        <div class="grouped-field flex-1">
          <label>Gender</label>
          <select class="pax-input-gender" data-idx="${idx}">
            <option value="M" ${p.gender === 'M' ? 'selected' : ''}>Male</option>
            <option value="F" ${p.gender === 'F' ? 'selected' : ''}>Female</option>
            <option value="T" ${p.gender === 'T' ? 'selected' : ''}>Transgender</option>
          </select>
        </div>
        <div class="grouped-field flex-1">
          <label>Berth</label>
          <select class="pax-input-berth" data-idx="${idx}">
            <option value="" ${!p.berthPreference ? 'selected' : ''}>No Preference</option>
            <option value="LB" ${p.berthPreference === 'LB' ? 'selected' : ''}>Lower (LB)</option>
            <option value="MB" ${p.berthPreference === 'MB' ? 'selected' : ''}>Middle (MB)</option>
            <option value="UB" ${p.berthPreference === 'UB' ? 'selected' : ''}>Upper (UB)</option>
            <option value="SL" ${p.berthPreference === 'SL' ? 'selected' : ''}>Side Lower (SL)</option>
            <option value="SU" ${p.berthPreference === 'SU' ? 'selected' : ''}>Side Upper (SU)</option>
          </select>
        </div>
      </div>
    `;
    paxCardsContainer.appendChild(card);
  });

  // Attach delete handlers
  paxCardsContainer.querySelectorAll('.btn-delete-pax').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      passengersList.splice(idx, 1);
      renderPassengerCards();
    });
  });

  // Attach change listeners to sync array
  paxCardsContainer.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', syncPaxValues);
  });
}

function syncPaxValues() {
  const cards = paxCardsContainer.querySelectorAll('.pax-item-card');
  passengersList = Array.from(cards).map(card => ({
    name: card.querySelector('.pax-input-name')?.value.trim() || '',
    age: card.querySelector('.pax-input-age')?.value.trim() || '',
    gender: card.querySelector('.pax-input-gender')?.value || 'M',
    nationality: 'IN',
    berthPreference: card.querySelector('.pax-input-berth')?.value || ''
  }));
}

btnAddPaxCard.addEventListener('click', () => {
  if (passengersList.length >= 4) {
    showError('Maximum 4 Tatkal passengers allowed per booking.');
    return;
  }
  passengersList.push({ name: '', age: '', gender: 'M', nationality: 'IN', berthPreference: '' });
  renderPassengerCards();
});

/* ── Save Configuration ─────────────────────────────────────────────── */

function extractFormConfig() {
  const uid = cfgUserId.value.trim() || quickUserId.value.trim();
  const pwd = cfgPassword.value || quickPassword.value;

  return {
    bookingSite:   cfgBookingSite ? cfgBookingSite.value : 'eticket',
    userId:        uid,
    password:      pwd,
    travelDate:    cfgDate.value || getTomorrowDateString(),
    fromStation:   cfgFrom.value.trim().toUpperCase(),
    toStation:     cfgTo.value.trim().toUpperCase(),
    journeyClass:  cfgClass.value,
    trainNumber:   cfgTrain.value.trim(),
    paymentMethod: cfgPaymentMethod ? cfgPaymentMethod.value : 'ewallet',
    ewalletPin:    cfgEwalletPin ? cfgEwalletPin.value.trim() : '',
    upiId:         cfgUpiId ? cfgUpiId.value.trim() : '',
    bankName:      cfgBankName ? cfgBankName.value : 'SBI',
    cardNumber:    cfgCardNumber ? cfgCardNumber.value.trim() : '',
    cardExpiry:    cfgCardExpiry ? cfgCardExpiry.value.trim() : '',
    cardName:      cfgCardName ? cfgCardName.value.trim() : '',
    cardCvv:       cfgCardCvv ? cfgCardCvv.value.trim() : '',
    bookOnlyIfCnf: cfgBookOnlyIfCnf ? cfgBookOnlyIfCnf.checked : true,
    passengers:    passengersList.filter(p => p.name.length > 0),
    fallbackFrom:  cfgFallbackFrom.value.trim().toUpperCase(),
    fallbackTo:    cfgFallbackTo.value.trim().toUpperCase(),
    dryRun:        cfgDryRun.checked
  };
}

popupConfigForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  syncPaxValues();

  const config = extractFormConfig();
  currentConfig = config;

  quickUserId.value   = config.userId;
  quickPassword.value = config.password;
  await chrome.storage.local.set({ userId: config.userId, password: config.password });

  await chrome.storage.local.set({
    config,
    tatkal_config: config
  });

  // Return to monitor view with spatial transition
  configView.className = 'view view-hidden';
  monitorView.className = 'view view-active';
  toggleConfigBtn.style.display = 'inline-flex';

  refreshMonitorFromConfig(config);
  setStatus('ready', 'Configuration Saved ✓', 'Ready to ARM or execute');
});

/* ── 1-Click Operations (Direct Execution) ─────────────────────────── */

autoLoginBtn.addEventListener('click', async () => {
  const userId = quickUserId.value.trim();
  const password = quickPassword.value;

  if (!userId || !password) {
    showError('Please enter IRCTC User ID & Password first.');
    return;
  }

  await chrome.storage.local.set({ userId, password });
  setStatus('running', 'Filling & Signing In…', 'Targeting IRCTC login modal');

  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'AUTO_LOGIN', userId, password, clickSubmit: true }
  });

  if (res && res.success) {
    setStatus('ready', res.submitted ? 'Signed In ✓' : 'Credentials Filled ✓', 'Login processed');
  } else {
    showError(res?.error || 'Auto-login failed. Make sure IRCTC is open.');
    setStatus('ready', 'Login Standby', 'Check credentials');
  }
});

signInSubmitBtn.addEventListener('click', async () => {
  setStatus('running', 'Clicking SIGN IN…', 'Submitting IRCTC login modal');
  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'CLICK_LOGIN_SUBMIT' }
  });

  if (res && res.success) {
    setStatus('ready', 'SIGN IN Clicked ✓', 'Authenticating on IRCTC');
  } else {
    showError('Could not find SIGN IN button on IRCTC modal.');
  }
});

btnActAutoFillPage.addEventListener('click', async () => {
  setStatus('running', 'Auto-Filling Current Page…', 'Detecting active IRCTC step');
  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'AUTO_FILL_PAGE', config: currentConfig }
  });

  if (res && res.success) {
    setStatus('ready', `${res.stage || 'Page Auto-Filled'} ✓`, 'Step completed');
  } else {
    showError(res?.error || 'Auto-fill failed. Make sure IRCTC is open.');
  }
});

btnActTatkal.addEventListener('click', async () => {
  setStatus('running', 'Selecting TATKAL…', 'Scanning quota controls');
  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'SELECT_TATKAL_QUOTA' }
  });

  if (res && res.success) {
    setStatus('ready', 'TATKAL Quota Locked ✓', 'Selected on IRCTC');
  } else {
    showError('Could not select TATKAL quota. Ensure you are on search or train-list.');
  }
});

btnActClass.addEventListener('click', async () => {
  const cls = currentConfig.journeyClass || 'SL';
  const train = currentConfig.trainNumber || '';
  setStatus('running', `Selecting ${cls} Seats…`, 'Enquiring availability');

  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'CLICK_CLASS_SEATS', journeyClass: cls, trainNumber: train }
  });

  if (res && res.success) {
    setStatus('ready', `${cls} Seat Locked ✓`, 'Clicked Book Now');
  } else {
    showError(res?.error || `Could not find or select ${cls} seats.`);
  }
});

btnActPassengers.addEventListener('click', async () => {
  syncPaxValues();
  const validPax = passengersList.filter(p => p.name.length > 0);
  if (validPax.length === 0) {
    showError('No passenger names found. Configure passengers in Settings first.');
    return;
  }

  setStatus('running', 'Filling Passengers…', 'Populating passenger form');
  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'FILL_PASSENGERS', passengers: validPax }
  });

  if (res && res.success) {
    setStatus('ready', 'Passengers Filled ✓', `${validPax.length} rows verified`);
  } else {
    showError(res?.error || 'Passenger fill failed. Ensure you are on passenger page.');
  }
});

btnActPay.addEventListener('click', async () => {
  const pm = currentConfig.paymentMethod || 'ewallet';
  setStatus('running', `Initiating Auto-Pay (${pm.toUpperCase()})…`, 'Selecting payment gateway');
  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: {
      type: 'EXECUTE_PAYMENT',
      options: {
        method: pm,
        ewalletPin: currentConfig.ewalletPin || '',
        upiId: currentConfig.upiId || '',
        bankName: currentConfig.bankName || 'SBI',
        cardNumber: currentConfig.cardNumber || '',
        cardExpiry: currentConfig.cardExpiry || '',
        dryRun: currentConfig.dryRun === true
      }
    }
  });

  if (res && res.success) {
    setStatus('ready', 'Payment Selected ✓', res.message || 'Pay & Book initiated');
  } else {
    showError(res?.error || 'Could not execute payment. Ensure you are on IRCTC payment page.');
  }
});

btnActJourney.addEventListener('click', async () => {
  setStatus('running', 'Prefilling Journey…', 'Setting origin, destination, date');
  const res = await chrome.runtime.sendMessage({
    type: 'FORWARD_ACTION',
    payload: { type: 'FILL_JOURNEY_DETAILS', config: currentConfig }
  });

  if (res && res.success) {
    setStatus('ready', 'Journey Details Filled ✓', 'Ready for search');
  } else {
    showError(res?.error || 'Could not prefill journey. Open irctc.co.in/nget/train-search.');
  }
});

/* ── Primary Booking Engine Actions ─────────────────────────────────── */

armBtn.addEventListener('click', async () => {
  armBtn.disabled = true;
  hideError();

  setStatus('running', 'Arming Precision Chain…', 'Verifying session and atomic fire instant');

  const res = await chrome.runtime.sendMessage({ type: 'ARM' });

  if (res && res.ok) {
    targetTime = res.targetTime;
    runStartTime = performance.now();
    setArmedUI(res.targetTime);
  } else {
    showError(res ? res.error : 'Connection error. Refresh IRCTC tab.');
    armBtn.disabled = false;
    setStatus('ready', 'Arming Failed', 'Check parameters');
  }
});

runNowBtn.addEventListener('click', async () => {
  hideError();
  setStatus('running', 'RUNNING IMMEDIATE SEQUENCE…', 'Executing all stages without clock hold');

  const res = await chrome.runtime.sendMessage({ type: 'RUN_NOW' });
  if (res && res.ok) {
    runStartTime = performance.now();
    armBtn.classList.add('hidden');
    runNowBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    timelineSection.classList.remove('hidden');
  } else {
    showError(res?.error || 'Could not execute. Ensure IRCTC tab is open.');
  }
});

stopBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'STOP' });
  clearCountdown();
  setIdleUI();
  setStatus('ready', 'Run Aborted', 'Engine standing by');
});

/* ── Countdown & Status Helpers ─────────────────────────────────────── */

function setArmedUI(target) {
  armBtn.classList.add('hidden');
  runNowBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  timelineSection.classList.remove('hidden');

  setStatus('armed', 'LIVE TATKAL ARMED', 'Search fires at T−0.5s automatically');

  clearCountdown();
  countdownId = setInterval(() => {
    if (targetTime) {
      updateCountdownDisplay(targetTime - Date.now());
    }
  }, 50);
}

function setIdleUI() {
  armBtn.classList.remove('hidden');
  armBtn.disabled = false;
  runNowBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
}

function updateCountdownDisplay(remaining) {
  if (remaining <= 0) {
    countdownDigits.textContent = '00:00:00';
    countdownDigits.classList.add('urgent');
    return;
  }

  const sTotal = Math.floor(remaining / 1000);
  const hours = Math.floor(sTotal / 3600);
  const mins = Math.floor((sTotal % 3600) / 60);
  const secs = sTotal % 60;

  countdownDigits.textContent =
    `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (remaining < 15_000) {
    countdownDigits.classList.add('urgent');
  } else {
    countdownDigits.classList.remove('urgent');
  }
}

function clearCountdown() {
  if (countdownId) {
    clearInterval(countdownId);
    countdownId = null;
  }
}

function setStatus(dotClass, title, subtitle) {
  statusDot.className = `status-indicator ${dotClass}`;
  statusTitle.textContent = title;
  statusSubtitle.textContent = subtitle;
}

/* ── Telemetry Updates from Content Script ──────────────────────────── */

chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
    case 'STAGE_UPDATE':
      if (msg.stage === 'countdown' && msg.data) {
        updateCountdownDisplay(msg.data.remaining);
      } else {
        appendTimelineRow(msg.stage, msg.timestamp);
      }
      break;

    case 'CHAIN_COMPLETE':
      clearCountdown();
      if (msg.success) {
        setStatus('ready', msg.dryRun ? 'Test Run Completed ✓' : 'Booking Completed ✓', msg.message || 'Check active tab');
      } else {
        setStatus('error', 'Execution Halted', msg.message || msg.error || 'Check active tab');
        showError(msg.message || msg.error || 'Execution halted. Please review IRCTC tab.');
      }
      setIdleUI();
      break;
  }
});

function appendTimelineRow(stage, timestamp) {
  timelineSection.classList.remove('hidden');
  const row = document.createElement('div');
  row.className = 'timeline-row';

  const tStr = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
      })
    : '';

  row.innerHTML = `<span>${stage}</span><span>${tStr}</span>`;
  timelineLog.appendChild(row);
  timelineLog.scrollTop = timelineLog.scrollHeight;

  if (runStartTime) {
    const elapsed = Math.round(performance.now() - runStartTime);
    elapsedTimer.textContent = `${elapsed}ms`;
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorAlert.classList.remove('hidden');
  setTimeout(hideError, 5000);
}

function hideError() {
  errorAlert.classList.add('hidden');
  errorMessage.textContent = '';
}
