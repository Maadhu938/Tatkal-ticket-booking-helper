/**
 * options.js — Impeccable Operate Mode Configuration Controller.
 */

'use strict';

/* ── DOM References ─────────────────────────────────────────────────── */

const form               = document.getElementById('configForm');
const userId             = document.getElementById('userId');
const password           = document.getElementById('password');
const travelDate         = document.getElementById('travelDate');
const fromStation        = document.getElementById('fromStation');
const toStation          = document.getElementById('toStation');
const journeyClass       = document.getElementById('journeyClass');
const trainNumber        = document.getElementById('trainNumber');
const passengerContainer = document.getElementById('passengerContainer');
const addPaxBtn          = document.getElementById('addPaxBtn');
const fallbackFrom       = document.getElementById('fallbackFrom');
const fallbackTo         = document.getElementById('fallbackTo');
const paymentMethod      = document.getElementById('paymentMethod');
const ewalletPin         = document.getElementById('ewalletPin');
const upiId              = document.getElementById('upiId');
const bankName           = document.getElementById('bankName');
const cardNumber         = document.getElementById('cardNumber');
const dryRunToggle       = document.getElementById('dryRun');
const liveBanner         = document.getElementById('liveBanner');
const toastRoot          = document.getElementById('toastRoot');

let passengers = [];

/* ── Load Configuration ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['config', 'userId', 'password']);
  const cfg = data.config || {};

  userId.value       = data.userId || cfg.userId || '';
  password.value     = data.password || cfg.password || '';
  travelDate.value   = cfg.travelDate   || '';
  fromStation.value  = cfg.fromStation  || '';
  toStation.value    = cfg.toStation    || '';
  journeyClass.value = cfg.journeyClass || 'SL';
  trainNumber.value  = cfg.trainNumber  || '';
  fallbackFrom.value = cfg.fallbackFrom || '';
  fallbackTo.value   = cfg.fallbackTo   || '';

  // Payment configuration
  if (paymentMethod) paymentMethod.value = cfg.paymentMethod || 'ewallet';
  if (ewalletPin)    ewalletPin.value    = cfg.ewalletPin || '';
  if (upiId)         upiId.value         = cfg.upiId || '';
  if (bankName)      bankName.value      = cfg.bankName || 'SBI';
  if (cardNumber)    cardNumber.value    = cfg.cardNumber || '';

  // Default LIVE BOOKING
  dryRunToggle.checked = cfg.dryRun === true;
  updateLiveBanner();

  // Load passengers
  if (Array.isArray(cfg.passengers) && cfg.passengers.length > 0) {
    passengers = cfg.passengers.map(p => {
      if (typeof p === 'string') {
        return { name: p, age: '30', gender: 'M', nationality: 'IN', berthPreference: '' };
      }
      return p;
    });
  } else {
    passengers = [{ name: '', age: '30', gender: 'M', nationality: 'IN', berthPreference: '' }];
  }

  renderPassengers();
});

dryRunToggle.addEventListener('change', updateLiveBanner);

function updateLiveBanner() {
  if (dryRunToggle.checked) {
    liveBanner.classList.add('hidden');
  } else {
    liveBanner.classList.remove('hidden');
  }
}

/* ── Passenger List Manager ─────────────────────────────────────────── */

addPaxBtn.addEventListener('click', () => {
  if (passengers.length >= 6) {
    showToast('Maximum 6 passengers allowed on Tatkal booking', 'error');
    return;
  }
  passengers.push({ name: '', age: '30', gender: 'M', nationality: 'IN', berthPreference: '' });
  renderPassengers();
});

function renderPassengers() {
  passengerContainer.innerHTML = '';

  passengers.forEach((pax, index) => {
    const card = document.createElement('div');
    card.className = 'pax-card';
    card.innerHTML = `
      <div class="pax-card-header">
        <span class="pax-number">Passenger ${index + 1}</span>
        ${passengers.length > 1 ? `<button type="button" class="btn-remove-pax" data-index="${index}">✕ Remove</button>` : ''}
      </div>
      <div class="pax-grid">
        <input type="text" placeholder="Full Name (Master List)" value="${pax.name || ''}" data-field="name" data-index="${index}" spellcheck="false" required>
        <input type="number" placeholder="Age" min="1" max="120" value="${pax.age || '30'}" data-field="age" data-index="${index}">
        <select data-field="gender" data-index="${index}">
          <option value="M" ${pax.gender === 'M' ? 'selected' : ''}>Male</option>
          <option value="F" ${pax.gender === 'F' ? 'selected' : ''}>Female</option>
          <option value="T" ${pax.gender === 'T' ? 'selected' : ''}>Transgender</option>
        </select>
        <select data-field="berthPreference" data-index="${index}">
          <option value="" ${!pax.berthPreference ? 'selected' : ''}>No Pref</option>
          <option value="LB" ${pax.berthPreference === 'LB' ? 'selected' : ''}>Lower</option>
          <option value="MB" ${pax.berthPreference === 'MB' ? 'selected' : ''}>Middle</option>
          <option value="UB" ${pax.berthPreference === 'UB' ? 'selected' : ''}>Upper</option>
          <option value="SL" ${pax.berthPreference === 'SL' ? 'selected' : ''}>Side Lower</option>
          <option value="SU" ${pax.berthPreference === 'SU' ? 'selected' : ''}>Side Upper</option>
        </select>
      </div>
    `;
    passengerContainer.appendChild(card);
  });

  // Attach change listeners
  passengerContainer.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      const field = e.target.dataset.field;
      passengers[idx][field] = e.target.value;
    });
  });

  // Attach remove listeners
  passengerContainer.querySelectorAll('.btn-remove-pax').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      passengers.splice(idx, 1);
      renderPassengers();
    });
  });
}

/* ── Validation ─────────────────────────────────────────────────────── */

function validate() {
  let valid = true;

  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

  if (!travelDate.value) {
    showError('travelDate', 'Select date of journey');
    valid = false;
  }

  if (!fromStation.value.trim()) {
    showError('fromStation', 'Origin code required');
    valid = false;
  }

  if (!toStation.value.trim()) {
    showError('toStation', 'Destination code required');
    valid = false;
  }

  if (!journeyClass.value) {
    showError('journeyClass', 'Select journey class');
    valid = false;
  }

  const validPax = passengers.filter(p => p.name && p.name.trim().length > 0);
  if (validPax.length === 0) {
    showToast('Add at least one passenger name', 'error');
    valid = false;
  }

  const fb1 = fallbackFrom.value.trim();
  const fb2 = fallbackTo.value.trim();
  if ((fb1 && !fb2) || (!fb1 && fb2)) {
    showToast('Both fallback stations are required if using fallback', 'error');
    valid = false;
  }

  return valid;
}

function showError(fieldId, msg) {
  const errEl = document.getElementById(fieldId + 'Error');
  if (errEl) errEl.textContent = msg;
  const el = document.getElementById(fieldId);
  if (el) el.classList.add('invalid');
}

/* ── Form Save Handler ──────────────────────────────────────────────── */

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validate()) return;

  const uid = userId.value.trim();
  const pwd = password.value;

  await chrome.storage.local.set({ userId: uid, password: pwd });

  const validPassengers = passengers
    .map(p => ({
      name: p.name.trim(),
      age: p.age ? String(p.age).trim() : '30',
      gender: p.gender || 'M',
      nationality: 'IN',
      berthPreference: p.berthPreference || ''
    }))
    .filter(p => p.name.length > 0);

  const config = {
    userId:        uid,
    password:      pwd,
    travelDate:    travelDate.value,
    fromStation:   fromStation.value.trim().toUpperCase(),
    toStation:     toStation.value.trim().toUpperCase(),
    journeyClass:  journeyClass.value,
    trainNumber:   trainNumber.value.trim(),
    passengers:    validPassengers,
    fallbackFrom:  fallbackFrom.value.trim().toUpperCase(),
    fallbackTo:    fallbackTo.value.trim().toUpperCase(),
    paymentMethod: paymentMethod ? paymentMethod.value : 'ewallet',
    ewalletPin:    ewalletPin ? ewalletPin.value.trim() : '',
    upiId:         upiId ? upiId.value.trim() : '',
    bankName:      bankName ? bankName.value : 'SBI',
    cardNumber:    cardNumber ? cardNumber.value.trim() : '',
    dryRun:        dryRunToggle.checked
  };

  await chrome.storage.local.set({ config });
  showToast(config.dryRun ? 'Configuration saved in Test Mode' : 'Parameters Saved — Armed for Live Booking', 'success');
});

/* ── Toast Notification ─────────────────────────────────────────────── */

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const iconSvg = type === 'success'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  toastRoot.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.remove(); }, 200);
  }, 2800);
}
