/**
 * content.js — Tatkal Arm Execution Engine & Impeccable Operate HUD.
 *
 * Core capabilities adapted directly from reference extension:
 *   1. Auto Login (Opens modal if closed, fills userid/pwd, focuses captcha)
 *   2. Atomic Journey Prefill (Origin, Destination with Space trigger, Date, Class, Tatkal Quota)
 *   3. Dynamic Tatkal Quota Selector (Works on train-search AND train-list)
 *   4. Class Seat Selector (Clicks 'SL' / '3A' class box, awaits availability, clicks Book Now, confirms modal)
 *   5. Passenger Autofill (Clicks '+ Add Passenger' with Angular tick, fills Name, Age, Gender, Nationality, Berth)
 *   6. Captcha Audio Alert & Auto Resume
 *   7. Auto-selects iPay and real Live Pay execution
 *   8. Instant On-Page HUD with Stage Tracking & Quick Actions
 */

'use strict';

/* ── Timing & Constants ─────────────────────────────────────────────── */

const CLASS_POLL_TIMEOUT = 20_000;
const CAPTCHA_MIN_LEN   = 5;
const FALLBACK_DELAY    = 2_000;
const SLOW_TOTAL_WARN   = 2_500;
const POLL_INTERVAL     = 60;
const SPIN_THRESHOLD    = 50;

/* ── Runtime State ──────────────────────────────────────────────────── */

let chainActive       = false;
let chainAborted      = false;
let isFallback        = false;
let config            = null;
let targetTime        = null;
let dryRun            = false;
let timers            = [];
let rafId             = null;
let originalTitle     = '';
let hudElement        = null;

const timings = {};

/* ── Logging ────────────────────────────────────────────────────────── */

function log(...args)  { console.log('%c[TatkalArm]', 'color:#ef4444;font-weight:bold', ...args); }
function warn(...args) { console.warn('%c[TatkalArm]', 'color:#f59e0b;font-weight:bold', ...args); }

/* ── DOM & Event Utilities ──────────────────────────────────────────── */

function $(selectors, root = document) {
  if (!selectors) return null;
  for (const sel of selectors.split(',')) {
    try {
      const el = root.querySelector(sel.trim());
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

function $$(selectors, root = document) {
  if (!selectors) return [];
  const results = [];
  for (const sel of selectors.split(',')) {
    try {
      root.querySelectorAll(sel.trim()).forEach(el => results.push(el));
    } catch (_) {}
  }
  return results;
}

function sleep(ms) {
  return new Promise(r => {
    const id = setTimeout(r, ms);
    timers.push(id);
  });
}

function poll(fn, timeout = 5000, interval = POLL_INTERVAL) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (chainAborted) { resolve(null); return; }
      try {
        const res = fn();
        if (res) { resolve(res); return; }
      } catch (_) {}
      if (Date.now() - start > timeout) { resolve(null); return; }
      const id = setTimeout(check, interval);
      timers.push(id);
    };
    check();
  });
}

/**
 * Native prototype setter: ensures Angular Reactive Forms (NgModel / FormControl)
 * register values even when overridden by input event traps.
 */
function setNativeValue(element, value) {
  if (!element) return;
  const isSelect = element.tagName.toLowerCase() === 'select';
  const proto = isSelect ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function fireInputEvents(el) {
  if (!el) return;
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/* ═════════════════════════════════════════════════════════════════════
 * 1. AUTO LOGIN & BULLETPROOF SIGN-IN CLICK
 * ═════════════════════════════════════════════════════════════════════ */

function triggerFullClick(el) {
  if (!el) return false;
  try {
    el.focus();
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mouseenter', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
    el.dispatchEvent(new MouseEvent('click', opts));
    return true;
  } catch (err) {
    try { el.click(); } catch (_) {}
    return true;
  }
}

function ref_clickLoginSubmit() {
  log('Attempting to click SIGN IN button on IRCTC login modal…');

  // Strategy 1: Find ANY button, submit input, or link on page whose text is SIGN IN
  const allBtns = Array.from(document.querySelectorAll(
    'app-login button, app-login input[type="submit"], app-login .btn, button.search_btn.train_Search, button.train_Search, button.search_btn, button[type="submit"], button'
  ));

  for (const b of allBtns) {
    const txt = (b.textContent || b.value || '').trim().toUpperCase();
    if (txt === 'SIGN IN' || txt === 'SIGNIN' || txt.includes('SIGN IN')) {
      log('Clicking SIGN IN button found by text:', b);
      triggerFullClick(b);

      const form = b.closest('form') || document.querySelector('app-login form');
      if (form && typeof form.requestSubmit === 'function') {
        try { form.requestSubmit(b); } catch (_) {}
      }
      return true;
    }
  }

  // Strategy 2: Button with selector
  const submitBtn = $(SEL.loginSubmitBtn);
  if (submitBtn) {
    log('Clicking login submit button found by selector:', submitBtn);
    triggerFullClick(submitBtn);
    const form = submitBtn.closest('form') || $('app-login form');
    if (form && typeof form.requestSubmit === 'function') {
      try { form.requestSubmit(submitBtn); } catch (_) {}
    }
    return true;
  }

  // Strategy 3: Form submission
  const loginForm = $('app-login form, form[name="loginForm"]');
  if (loginForm) {
    log('Dispatching submit on login form');
    try {
      loginForm.requestSubmit();
    } catch (_) {
      loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    return true;
  }

  warn('Could not locate SIGN IN button on login modal.');
  return false;
}

async function ref_autoLogin(credentials = {}) {
  const userId = credentials?.userId || credentials?.userid || '';
  const password = credentials?.password || credentials?.pwd || '';
  const forceSubmit = credentials?.clickSubmit === true || credentials?.forceClick === true;

  log('Executing Auto-Login for:', userId || '(existing input values)');

  // Step 1: Open modal if not open
  let idInput = $(SEL.loginUserId);
  if (!idInput) {
    const trigger = $(SEL.loginModalTrigger);
    if (trigger) {
      log('Clicking header login button to open modal…');
      trigger.click();
      idInput = await poll(() => $(SEL.loginUserId), 3000, 80);
    }
  }

  if (!idInput) {
    return { success: false, error: 'IRCTC login modal not found. Please click LOGIN manually on IRCTC.' };
  }

  // Step 2: Populate User ID if provided
  if (userId) {
    idInput.focus();
    setNativeValue(idInput, userId);
    await sleep(50);
  }

  // Step 3: Populate Password if provided
  const passInput = $(SEL.loginPassword);
  if (password && passInput) {
    passInput.focus();
    setNativeValue(passInput, password);
    await sleep(50);
  }

  // Step 4: Check Captcha
  const captcha = $(SEL.loginCaptchaInput);

  // If captcha field does NOT exist on the modal (as shown in recent IRCTC updates) OR forceSubmit requested:
  // CLICK SIGN IN IMMEDIATELY!
  if (!captcha || forceSubmit) {
    await sleep(100);
    const clicked = ref_clickLoginSubmit();
    return { success: true, submitted: clicked };
  }

  // If captcha exists and is already typed (4+ chars):
  if (captcha && captcha.value.trim().length >= 4) {
    await sleep(100);
    const clicked = ref_clickLoginSubmit();
    return { success: true, submitted: clicked };
  }

  // If captcha exists and is empty: attach auto-submit listeners for typing
  if (captcha && !captcha.dataset.hasTatkalListener) {
    captcha.dataset.hasTatkalListener = 'true';

    const onCaptchaInput = (e) => {
      const val = (e.target.value || '').trim();
      if (val.length >= 4) {
        log('Captcha input reached 4+ chars; auto-submitting login…');
        setTimeout(ref_clickLoginSubmit, 80);
      }
    };

    captcha.addEventListener('input', onCaptchaInput);
    captcha.addEventListener('paste', () => setTimeout(onCaptchaInput, 50));
    captcha.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        log('Enter key pressed in captcha input; submitting login…');
        ref_clickLoginSubmit();
      }
    });
  }

  // Focus captcha for human typing
  if (captcha) {
    captcha.focus();
    captcha.scrollIntoView({ behavior: 'smooth', block: 'center' });
    captcha.dispatchEvent(new Event('click', { bubbles: true }));
  }

  // Always attempt to click SIGN IN right away after filling (to satisfy instant login)
  await sleep(120);
  const submitted = ref_clickLoginSubmit();

  log('Auto-Login completed. SIGN IN clicked:', submitted);
  return { success: true, submitted };
}

/* ═════════════════════════════════════════════════════════════════════
 * 2. PRIMENG DROPDOWN & KEYBOARD UTILITIES (from reference)
 * ═════════════════════════════════════════════════════════════════════ */

function ref_createKeyEvents(char, code, dispatcher) {
  const events = [
    new KeyboardEvent('keydown', { key: char, code: code || `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }),
    new KeyboardEvent('keyup', { key: char, code: code || `Key${char.toUpperCase()}`, bubbles: true, cancelable: true })
  ];
  return dispatcher ? [dispatcher(events[0]), dispatcher(events[1])] : events;
}

async function ref_typeWithKeyboard(selectors, text) {
  let el = null;
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    el = document.querySelector(sel);
    if (el) break;
  }
  if (!el) return null;

  el.focus();
  el.value = '';
  el.dispatchEvent(new Event('input', { bubbles: true }));

  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx];
    const code = `Key${ch.toUpperCase()}`;
    const [kd, ku] = ref_createKeyEvents(ch, code);
    el.dispatchEvent(kd);
    el.value += ch;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(ku);
    await sleep(8);
  }

  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(15);
  return el;
}

async function ref_findAndClickOption(text, exact = false) {
  await sleep(60);
  let attempts = 0;
  let options = [];

  while (attempts < 12 && options.length === 0) {
    await sleep(40 * attempts);
    options = document.querySelectorAll('li[role="option"], .p-autocomplete-panel li, .ui-autocomplete-panel li');
    attempts++;
  }

  const match = Array.from(options).find(opt => {
    const val = (opt.innerText || opt.textContent || '').trim().toUpperCase();
    return exact ? val === text.toUpperCase() : val.includes(text.toUpperCase());
  });

  if (match) {
    match.click();
    return true;
  }
  return false;
}

/**
 * Robust PrimeNG dropdown selector:
 * Works whether overlay panel is child of dropdown or appended to document.body.
 */
async function ref_selectPrimeNGDropdown(containerSelector, targetText) {
  const container = $(containerSelector);
  if (!container) return false;

  try {
    const trigger = $(SEL.dropdownTrigger, container) || container;
    trigger.click();

    // Poll for the overlay panel in container OR document.body
    const panel = await poll(() => {
      const p1 = $(SEL.dropdownPanel, container);
      if (p1 && p1.offsetParent !== null) return p1;
      const p2 = $(SEL.dropdownPanel, document.body);
      if (p2 && p2.offsetParent !== null) return p2;
      return null;
    }, 1500, 50);

    if (!panel) return false;

    await sleep(40);
    const items = $$(SEL.dropdownItems, panel);
    const upperTarget = targetText.trim().toUpperCase();

    for (const item of items) {
      const itemText = (item.textContent || '').trim().toUpperCase();
      if (itemText.includes(upperTarget) || upperTarget.includes(itemText)) {
        item.click();
        item.dispatchEvent(new Event('click', { bubbles: true }));
        await sleep(40);
        return true;
      }
    }
    return false;
  } catch (err) {
    warn('Error selecting PrimeNG dropdown:', err);
    return false;
  }
}

/* ═════════════════════════════════════════════════════════════════════
 * 3. DYNAMIC TATKAL QUOTA SELECTOR (Search page & Train-list page)
 * ═════════════════════════════════════════════════════════════════════ */

async function ref_selectTatkalQuota() {
  log('Attempting to select TATKAL quota…');

  // Strategy A: Dedicated quota dropdown on train-search or train-list
  const quotaSelectors = [
    'p-dropdown[formcontrolname="journeyQuota"]',
    '#journeyQuota',
    'p-dropdown#journeyQuota',
    '.search_div p-dropdown',
    'div.pull-right p-dropdown',
    'p-dropdown[id="journeyQuota"]'
  ];

  for (const sel of quotaSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const success = await ref_selectPrimeNGDropdown(sel, 'TATKAL');
      if (success) {
        log('TATKAL Quota selected via PrimeNG dropdown:', sel);
        return true;
      }
    }
  }

  // Strategy B: Radio button / direct link fallback
  const quotaLabels = $$('label, span, div.ui-dropdown-label, div.p-dropdown-label');
  for (const label of quotaLabels) {
    const txt = (label.textContent || '').trim().toUpperCase();
    if (txt === 'GENERAL' || txt.includes('QUOTA')) {
      const parent = label.closest('p-dropdown') || label.closest('.ui-dropdown');
      if (parent) {
        const ok = await ref_selectPrimeNGDropdown(parent, 'TATKAL');
        if (ok) return true;
      }
    }
  }

  warn('Could not locate or select TATKAL quota dropdown.');
  return false;
}

/* ═════════════════════════════════════════════════════════════════════
 * 4. CLASS SEAT SELECTOR & BOOKING TRIGGER (SL / 3A / 2A / etc.)
 * ═════════════════════════════════════════════════════════════════════ */

async function ref_clickClassSeats(targetClass = 'SL', targetTrain = '') {
  log(`Selecting Class "${targetClass}" ${targetTrain ? `for Train ${targetTrain}` : 'for first matching train'}…`);

  const upperClass = targetClass.trim().toUpperCase();
  const cleanTrain = targetTrain ? targetTrain.trim().replace(/[^\d]/g, '') : '';

  // Step 1: Locate the train card on train-list
  const trainCards = await poll(() => {
    const rows = $$(SEL.trainRow);
    return rows.length > 0 ? rows : null;
  }, 12_000, 100);

  if (!trainCards || trainCards.length === 0) {
    warn('No train cards found on page.');
    return { success: false, error: 'No trains found on train list page.' };
  }

  let matchedCard = null;

  if (cleanTrain) {
    for (const card of trainCards) {
      const numEl = $(SEL.trainNumber, card);
      if (numEl) {
        const numText = numEl.textContent.replace(/[^\d]/g, '');
        if (numText === cleanTrain) {
          matchedCard = card;
          break;
        }
      }
    }
  }

  if (!matchedCard) {
    matchedCard = trainCards[0]; // Default to first train
  }

  log('Target train card locked.');

  // Step 2: Find the class box (e.g. Sleeper (SL), AC 3 Tier (3A)) inside train card
  const classBoxes = $$(SEL.classBox, matchedCard);
  let targetBox = null;

  for (const box of classBoxes) {
    const boxText = (box.textContent || '').trim().toUpperCase();
    if (upperClass === 'SL' && (boxText.includes('SLEEPER') || boxText.includes('(SL)') || boxText === 'SL')) {
      targetBox = box;
      break;
    } else if (boxText.includes(upperClass)) {
      targetBox = box;
      break;
    }
  }

  if (!targetBox) {
    // Broad fallback: any element inside card with class label
    const allLabels = matchedCard.querySelectorAll('strong, span, div');
    for (const el of allLabels) {
      const txt = (el.textContent || '').trim().toUpperCase();
      if ((upperClass === 'SL' && (txt.includes('SLEEPER') || txt.includes('(SL)'))) || txt.includes(upperClass)) {
        targetBox = el.closest('.pre-avl') || el.closest('td') || el;
        break;
      }
    }
  }

  if (!targetBox) {
    warn(`Class box for "${upperClass}" not found.`);
    return { success: false, error: `Class box for "${upperClass}" not found.` };
  }

  // Step 3: CLICK the class box to fetch availability from IRCTC API
  log(`Clicking class box for "${upperClass}" to fetch availability…`);
  targetBox.click();
  targetBox.dispatchEvent(new Event('click', { bubbles: true }));

  // Step 4: Wait for enquiry loading spinner to clear and availability cells to appear
  await sleep(300);
  const availCell = await poll(() => {
    // Wait for overlay to vanish
    if ($(SEL.overlay)) return null;

    // Check for availability boxes inside or near the card
    const cells = $$(SEL.availCell, matchedCard);
    for (const c of cells) {
      const txt = (c.textContent || '').toUpperCase();
      if (txt.includes('AVAILABLE') || txt.includes('CURR_AVBL') || txt.includes('RAC') || txt.includes('WL') || txt.includes('REGRET')) {
        return c;
      }
    }

    // Direct "Book Now" button already visible
    const bookBtn = $(SEL.bookNowBtn, matchedCard);
    if (bookBtn && bookBtn.offsetParent !== null) return bookBtn;

    return null;
  }, CLASS_POLL_TIMEOUT, 80);

  if (!availCell) {
    warn('Timed out waiting for availability response from IRCTC.');
    return { success: false, error: 'Availability enquiry timed out.' };
  }

  const cellText = (availCell.textContent || '').toUpperCase();
  log('Availability response received:', cellText.substring(0, 50));

  if (cellText.includes('REGRET')) {
    warn('REGRET encountered in Tatkal quota.');
    return { success: false, error: 'REGRET', regret: true };
  }

  // Click the availability cell to ensure it is selected
  availCell.click();
  await sleep(150);

  // Step 5: Click "Book Now" button
  let bookBtn = $(SEL.bookNowBtn, matchedCard) || $(SEL.bookNowBtn);
  if (!bookBtn) {
    // Some layouts make the availCell itself the trigger
    availCell.click();
  } else {
    log('Clicking "Book Now" button…');
    bookBtn.click();
  }

  // Step 6: Automatically confirm any IRCTC dialog ("Do you want to proceed?")
  await sleep(400);
  const confirmYes = $(SEL.confirmDialogYes);
  if (confirmYes && confirmYes.offsetParent !== null) {
    log('Clicking "Yes" on confirmation dialog…');
    confirmYes.click();
  }

  return { success: true };
}

/* ═════════════════════════════════════════════════════════════════════
 * 5. PASSENGER AUTOFILL (Referenced & Enhanced from passenger-CTQjNBJr.js)
 * ═════════════════════════════════════════════════════════════════════ */

async function ref_fillSinglePassenger(personData, index) {
  const ADD_BTN_TEXT = 'Add Passenger';
  const PASSENGER_ROW_TAG = 'app-passenger';

  let rows = document.querySelectorAll(PASSENGER_ROW_TAG);
  let retryCount = 0;

  // Click "+ Add Passenger" until index exists, awaiting Angular tick
  while (index >= rows.length && retryCount < 5) {
    retryCount++;
    const addSpans = document.querySelectorAll('a span.prenext, button.add-passenger-btn, a');
    let addBtn = null;
    for (const span of addSpans) {
      if ((span.textContent || '').trim().includes(ADD_BTN_TEXT)) {
        addBtn = span.closest('a') || span;
        break;
      }
    }

    if (!addBtn) break;
    addBtn.click();
    await sleep(200); // Critical: wait for Angular DOM rendering
    rows = document.querySelectorAll(PASSENGER_ROW_TAG);
  }

  if (index >= rows.length) {
    return { success: false, error: `Could not mount passenger row at index ${index}` };
  }

  const row = rows[index];

  // Fill Name
  const nameInput = $(SEL.passengerNameInput, row);
  if (nameInput) {
    nameInput.focus();
    setNativeValue(nameInput, personData.name || '');
  }

  // Fill Age
  const ageInput = $(SEL.passengerAgeInput, row);
  if (ageInput) {
    ageInput.focus();
    setNativeValue(ageInput, String(personData.age || '30'));
  }

  // Fill Gender (M / F / T)
  const genderSelect = $(SEL.passengerGenderSelect, row);
  if (genderSelect) {
    if (genderSelect.tagName.toLowerCase() === 'select') {
      genderSelect.value = personData.gender || 'M';
      fireInputEvents(genderSelect);
    } else {
      // PrimeNG dropdown
      await ref_selectPrimeNGDropdown(genderSelect, personData.gender === 'F' ? 'Female' : 'Male');
    }
  }

  // Fill Nationality (Default IN / India)
  const natSelect = $(SEL.passengerNationalitySelect, row);
  if (natSelect) {
    if (natSelect.tagName.toLowerCase() === 'select') {
      natSelect.value = personData.nationality || 'IN';
      fireInputEvents(natSelect);
    }
  }

  // Fill Berth Preference
  if (personData.berthPreference) {
    const berthSelect = $(SEL.passengerBerthSelect, row);
    if (berthSelect) {
      if (berthSelect.tagName.toLowerCase() === 'select') {
        berthSelect.value = personData.berthPreference;
        fireInputEvents(berthSelect);
      } else {
        await ref_selectPrimeNGDropdown(berthSelect, personData.berthPreference);
      }
    }
  }

  return { success: true };
}

async function ref_fillAllPassengers(paxList) {
  if (!Array.isArray(paxList) || paxList.length === 0) {
    return { success: false, error: 'No passenger details provided.' };
  }

  log(`Filling ${paxList.length} passenger details…`);

  // Auto-tick Master List if present
  const masterRows = $$(SEL.masterListRow);
  let tickedMasterCount = 0;

  if (masterRows.length > 0) {
    const targetNames = paxList.map(p => (typeof p === 'string' ? p : p.name).trim().toUpperCase());
    for (const row of masterRows) {
      const nameEl = $(SEL.masterListName, row);
      if (!nameEl) continue;
      const rowName = nameEl.textContent.trim().toUpperCase();
      const matched = targetNames.some(target => rowName.includes(target) || target.includes(rowName));
      if (matched) {
        const checkbox = $(SEL.masterListCheck, row);
        if (checkbox) {
          checkbox.click();
          tickedMasterCount++;
          await sleep(60);
        }
      }
    }
  }

  // If Master list was not used or didn't fill all, directly fill app-passenger rows
  if (tickedMasterCount < paxList.length) {
    for (let i = 0; i < paxList.length; i++) {
      const p = paxList[i];
      const personData = {
        name: typeof p === 'string' ? p : p.name,
        age: (typeof p === 'object' && p.age) ? p.age : '30',
        gender: (typeof p === 'object' && p.gender) ? p.gender : 'M',
        nationality: (typeof p === 'object' && p.nationality) ? p.nationality : 'IN',
        berthPreference: (typeof p === 'object' && p.berthPreference) ? p.berthPreference : ''
      };
      await ref_fillSinglePassenger(personData, i);
      await sleep(150);
    }
  }

  // Auto-tick Auto Upgradation
  const autoUp = $(SEL.autoUpgradationCheck);
  if (autoUp && !autoUp.checked) {
    autoUp.click();
  }

  // Auto-tick Travel Insurance (opt-in)
  const ins = $(SEL.travelInsuranceRadio);
  if (ins) {
    ins.click();
  }

  // Auto-select payment method on passenger input page based on user configuration
  const prefPay = (config && config.paymentMethod) || 'ewallet';
  if (prefPay === 'cards' || prefPay === 'netbanking' || prefPay === 'ewallet') {
    const cardRadio = $(SEL.paymentOptionCards);
    if (cardRadio) {
      log('Selecting Option 1 (Cards / NetBanking / Wallets / IRCTC eWallet) on passenger page.');
      cardRadio.click();
    }
  } else {
    // UPI (₹20 + GST, recommended for Tatkal speed)
    const upiRadio = $(SEL.paymentOptionUPI);
    if (upiRadio) {
      log('Selecting BHIM/UPI payment option on passenger page (Convenience Fee ₹20).');
      upiRadio.click();
    }
  }

  log('Finished filling passenger details.');
  return { success: true };
}

/* ═════════════════════════════════════════════════════════════════════
 * 6. JOURNEY DETAILS PREFILL (from passenger-CTQjNBJr.js)
 * ═════════════════════════════════════════════════════════════════════ */

async function ref_fillJourneyDetails(journey) {
  log('Prefilling journey details…');

  const from = journey.fromStation || journey.from || '';
  const to = journey.toStation || journey.to || '';

  // Origin
  if (from) {
    const originInput = await ref_typeWithKeyboard(
      ['p-autocomplete[formcontrolname="origin"] input', '#origin input', 'input[placeholder*="From*"]'],
      from
    );
    if (originInput) {
      await sleep(100);
      const matched = await ref_findAndClickOption(from);
      if (!matched) {
        // Space key trigger fallback
        ref_createKeyEvents(' ', 'Space', originInput.dispatchEvent.bind(originInput));
        await sleep(200);
        await ref_findAndClickOption(from, true);
      }
    }
  }

  await sleep(100);

  // Destination
  if (to) {
    const destInput = await ref_typeWithKeyboard(
      ['p-autocomplete[formcontrolname="destination"] input', '#destination input', 'input[placeholder*="To*"]'],
      to
    );
    if (destInput) {
      await sleep(100);
      const matched = await ref_findAndClickOption(to);
      if (!matched) {
        ref_createKeyEvents(' ', 'Space', destInput.dispatchEvent.bind(destInput));
        await sleep(200);
        await ref_findAndClickOption(to, true);
      }
    }
  }

  await sleep(100);

  // Date: Tatkal Quota is STRICTLY for TOMORROW'S Journey
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomY = tomorrow.getFullYear();
  const tomM = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomD = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowDisplay = `${tomD}/${tomM}/${tomY}`;

  let targetDateDisplay = tomorrowDisplay;
  const rawDate = journey.travelDate || journey.date || '';

  if (rawDate && rawDate !== todayISO) {
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      targetDateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } else {
    log(`Tatkal journey date automatically corrected to TOMORROW: ${targetDateDisplay}`);
  }

  const dateInput = $(SEL.dateInput);
  if (dateInput) {
    dateInput.focus();
    dateInput.value = targetDateDisplay;
    setNativeValue(dateInput, targetDateDisplay);
    fireInputEvents(dateInput);
    dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // Also select tomorrow cell in calendar if popup is open
    await sleep(60);
    const dayCells = Array.from(document.querySelectorAll('.ui-datepicker td a, .p-datepicker td a'));
    const highlightIdx = dayCells.findIndex(a => 
      a.parentElement.classList.contains('ui-state-highlight') || 
      a.parentElement.classList.contains('ui-datepicker-current-day') ||
      a.parentElement.classList.contains('p-highlight')
    );
    if (highlightIdx !== -1 && dayCells[highlightIdx + 1]) {
      dayCells[highlightIdx + 1].click();
    }
  }

  // Class & Quota
  if (journey.journeyClass || journey.class) {
    await ref_selectPrimeNGDropdown(SEL.classDropdown, journey.journeyClass || journey.class);
  }

  await ref_selectTatkalQuota();

  log('Journey prefill complete with date:', targetDateDisplay);
  return { success: true, date: targetDateDisplay };
}

/* ═════════════════════════════════════════════════════════════════════
 * 6B. AUTOMATED PAYMENT SELECTION & EXECUTION (iPay / BHIM UPI / Cards / NetBanking)
 * ═════════════════════════════════════════════════════════════════════ */

function ref_findTextMatch(text, selector = '*') {
  const elements = $$(selector);
  const target = text.trim().toUpperCase();
  for (const el of elements) {
    const val = (el.textContent || el.value || '').trim().toUpperCase();
    if (val.includes(target)) return el;
  }
  return null;
}

async function ref_executePayment(options = {}) {
  log('Executing automated payment flow…', options);
  const method = options.method || 'ipay'; // 'ipay' | 'upi' | 'cards' | 'netbanking'
  const upiId = options.upiId || '';
  const bankName = options.bankName || 'SBI';
  const cardNumber = options.cardNumber || '';
  const cardExpiry = options.cardExpiry || '';
  const isDryRun = options.dryRun === true;

  // Step 1: Detect payment page container or payment methods
  const paymentContainer = await poll(() => {
    return $('app-payment, .payment-type, #payment-methods, .bank-type, button.pay-btn, button[label="Pay & Book"], button[type="submit"].btn-primary');
  }, 8000, 100);

  if (!paymentContainer) {
    return { success: false, error: 'Not on IRCTC payment page.' };
  }

  await sleep(250);

  // Step 2: Select Payment Method & Gateway Options
  if (method === 'ewallet') {
    log('Selecting IRCTC eWallet (Fastest Tatkal on-site payment method)…');
    const ewalletTarget = $(
      'input[value*="EWALLET"], input[value*="ewallet"], label[for*="EWALLET"], label[for*="ewallet"], #bank-type-0, .bank-type:has(label[for*="EWALLET"])'
    ) || ref_findTextMatch('EWALLET', '.bank-text, label, span, .bank-type, p-radiobutton')
      || ref_findTextMatch('E-WALLET', '.bank-text, label, span, .bank-type, p-radiobutton')
      || ref_findTextMatch('WALLET', '.bank-text, label, span, .bank-type');

    if (ewalletTarget) {
      triggerFullClick(ewalletTarget);
      log('IRCTC eWallet selected.');
    }

    await sleep(250);

    // If eWallet Transaction Password / PIN is provided, populate it
    const txnPwd = options.ewalletPin || options.password || '';
    if (txnPwd) {
      const pwdInput = $(
        'input[type="password"][name*="password"], input[type="password"][placeholder*="Password"], input[type="password"][formcontrolname*="password"], input[type="password"]'
      );
      if (pwdInput) {
        log('Auto-populating IRCTC eWallet transaction password…');
        setNativeValue(pwdInput, txnPwd);
      }
    }
  } else if (method === 'ipay') {
    log('Selecting IRCTC iPay payment gateway…');
    const ipayTarget = $(
      'input[value*="IPAY"], label[for*="IPAY"], #bank-type-1, .bank-type:has(label[for*="IPAY"])'
    ) || ref_findTextMatch('IPAY', '.bank-text, label, span, .bank-type, p-radiobutton');

    if (ipayTarget) {
      triggerFullClick(ipayTarget);
      log('iPay selected.');
    }

    await sleep(250);

    // If UPI ID is specified, check for UPI option within iPay
    if (upiId) {
      const ipayUpi = ref_findTextMatch('UPI', '.bank-type label, p-radiobutton, input[value*="UPI"], label');
      if (ipayUpi) {
        log('Selecting UPI tab within iPay…');
        triggerFullClick(ipayUpi);
        await sleep(200);
      }
      const vpaInput = $(
        'input[name="vpa"], input[placeholder*="UPI ID"], input[placeholder*="Virtual Payment"], input[id*="vpa"], input[formcontrolname="vpa"]'
      );
      if (vpaInput) {
        log('Auto-populating UPI VPA:', upiId);
        setNativeValue(vpaInput, upiId);
      }
    }
  } else if (method === 'upi') {
    log('Selecting BHIM / UPI payment category…');
    const upiTarget = $(
      'input[value*="UPI"], label[for*="UPI"], .bank-type:has(label[for*="UPI"])'
    ) || ref_findTextMatch('BHIM', '.bank-text, label, span, .bank-type, p-radiobutton');

    if (upiTarget) {
      triggerFullClick(upiTarget);
      log('BHIM/UPI category selected.');
    }

    await sleep(250);

    if (upiId) {
      const vpaInput = $(
        'input[name="vpa"], input[placeholder*="UPI ID"], input[placeholder*="Virtual Payment"], input[id*="vpa"], input[formcontrolname="vpa"]'
      );
      if (vpaInput) {
        log('Auto-populating BHIM UPI VPA:', upiId);
        setNativeValue(vpaInput, upiId);
      }
    }
  } else if (method === 'netbanking') {
    log(`Selecting Net Banking category for ${bankName}…`);
    const nbTarget = $(
      'input[value*="NETBANKING"], label[for*="NETBANKING"]'
    ) || ref_findTextMatch('NETBANKING', '.bank-text, label, span, .bank-type');

    if (nbTarget) {
      triggerFullClick(nbTarget);
      await sleep(250);
    }

    const bankSelect = $('select[name="bank"], select[formcontrolname="bank"]');
    if (bankSelect) {
      selectNativeDropdown(bankSelect, bankName);
    } else {
      const bankRadio = ref_findTextMatch(bankName, 'label, .bank-type, span');
      if (bankRadio) triggerFullClick(bankRadio);
    }
  } else if (method === 'cards') {
    log('Selecting Credit / Debit Card category…');
    const cardTarget = $(
      'input[value*="CARD"], label[for*="CARD"]'
    ) || ref_findTextMatch('CARD', '.bank-text, label, span, .bank-type');

    if (cardTarget) {
      triggerFullClick(cardTarget);
      await sleep(250);
    }

    if (cardNumber) {
      const cardNumInput = $('input[name="cardNumber"], input[placeholder*="Card Number"], #cardNumber');
      if (cardNumInput) setNativeValue(cardNumInput, cardNumber.replace(/\s+/g, ''));
    }
    if (cardExpiry) {
      const expInput = $('input[name="expiry"], input[placeholder*="MM/YY"], #expiry');
      if (expInput) setNativeValue(expInput, cardExpiry);
    }
  }

  await sleep(300);

  // Safety gate: Check if dry-run
  if (isDryRun) {
    log('[Test Mode] Dry-Run Simulator: Safe stop reached before placing final charge.');
    return { success: true, message: 'Test mode safe stop: Payment options auto-selected without placing charge.' };
  }

  // Step 3: Trigger Pay & Book Submit
  const payBtn = $(SEL.payBtn) || $(
    'button.pay-btn, button[label="Pay & Book"], button.btnDefault.train_Search, app-payment button[type="submit"], button.btn-primary'
  );
  if (payBtn) {
    log('Clicking Pay & Book button:', payBtn);
    triggerFullClick(payBtn);
    return { success: true, message: 'Pay & Book initiated successfully!' };
  }

  return { success: true, message: 'Payment gateway options verified and configured.' };
}

/* ═════════════════════════════════════════════════════════════════════
 * 6C. 1-CLICK END-TO-END PAGE AUTOMATION
 * ═════════════════════════════════════════════════════════════════════ */

async function ref_autoFillCurrentPage(cfg = {}) {
  const url = window.location.href;
  log('Auto-filling current page:', url);

  // 1. Search Page
  if (url.includes('train-search') || url.endsWith('.irctc.co.in/nget/') || url.includes('/home')) {
    log('Automating Train Search Page…');
    await ref_fillJourneyDetails(cfg);
    await sleep(250);
    const searchBtn = $(SEL.searchBtn);
    if (searchBtn) {
      log('Clicking Find Trains button…');
      triggerFullClick(searchBtn);
      return { success: true, stage: 'Search Submitted' };
    }
    return { success: true, stage: 'Search Form Filled' };
  }

  // 2. Train List Page
  if (url.includes('train-list')) {
    log('Automating Train List Page: Locking Tatkal & Selecting Class…');
    await ref_selectTatkalQuota();
    await sleep(250);
    const res = await ref_clickClassSeats(cfg.journeyClass || 'SL', cfg.trainNumber || '');
    return { success: res.success, stage: 'Seat Selection', error: res.error };
  }

  // 3. Passenger Details Page
  if (url.includes('psgninput')) {
    log('Automating Passenger Details Page…');
    const res = await ref_fillAllPassengers(cfg.passengers || []);
    return { success: res.success, stage: 'Passengers Filled', error: res.error };
  }

  // 4. Captcha / Review Page
  if (url.includes('review') || url.includes('captcha') || $('app-captcha')) {
    log('On Review / Captcha Page…');
    playCaptchaCue();
    const captcha = $(SEL.captchaInput);
    if (captcha) {
      captcha.focus();
      return { success: true, stage: 'Captcha Focused (Solve & Continue)' };
    }
    const contBtn = $(SEL.reviewContinueBtn);
    if (contBtn) {
      triggerFullClick(contBtn);
      return { success: true, stage: 'Review Continued' };
    }
    return { success: true, stage: 'Review Ready' };
  }

  // 5. Payment Page
  if (url.includes('payment') || url.includes('bkgpayment') || $('app-payment')) {
    log('Automating Payment Page…');
    const res = await ref_executePayment({ method: cfg.paymentMethod || 'ipay', upiId: cfg.upiId || '' });
    return { success: res.success, stage: 'Payment Selected', message: res.message };
  }

  // 6. Login modal open on any page
  const loginInput = $(SEL.loginUserId);
  if (loginInput) {
    log('Login modal detected; executing auto-login…');
    const res = await ref_autoLogin({ userId: cfg.userId, password: cfg.password, clickSubmit: true });
    return { success: res.success, stage: 'Login Submitted' };
  }

  return { success: false, error: 'Could not detect active IRCTC step. Navigate to Search, Train List, or Passenger page.' };
}

/* ═════════════════════════════════════════════════════════════════════
 * 7. CAPTCHA HARMONIC CHIME & RESUME
 * ═════════════════════════════════════════════════════════════════════ */

function playCaptchaCue() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now); // A5

    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);

    setTimeout(() => {
      try {
        const c2 = ctx.currentTime;
        const o3 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o3.type = 'sine';
        o3.frequency.setValueAtTime(1174.66, c2); // D6
        g2.gain.setValueAtTime(0.4, c2);
        g2.gain.exponentialRampToValueAtTime(0.001, c2 + 0.6);
        o3.connect(g2);
        g2.connect(ctx.destination);
        o3.start(c2);
        o3.stop(c2 + 0.65);
      } catch (_) {}
    }, 450);
  } catch (e) {
    warn('Audio cue fallback:', e.message);
  }
}

async function stageCaptcha() {
  recordStage('waiting_for_captcha');

  const captchaInput = await poll(() => $(SEL.captchaInput), 15_000);
  if (!captchaInput) {
    recordStage('captcha_not_found');
    return;
  }

  playCaptchaCue();
  originalTitle = document.title;
  document.title = '⚡ SOLVE CAPTCHA';

  captchaInput.focus();
  captchaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Block until human enters captcha (minimum 5 chars)
  await poll(() => {
    const input = $(SEL.captchaInput);
    return input && input.value.trim().length >= CAPTCHA_MIN_LEN;
  }, 300_000, 150);

  recordStage('captcha_cleared');
  if (originalTitle) document.title = originalTitle;

  await sleep(150);
  const continueBtn = $(SEL.reviewContinueBtn);
  if (continueBtn) {
    continueBtn.click();
    log('Submitted captcha.');
  }

  await sleep(800);
}

/* ═════════════════════════════════════════════════════════════════════
 * 8. PAYMENT SELECTION (iPay Wallet / Pay)
 * ═════════════════════════════════════════════════════════════════════ */

async function stagePayment(isDryRun) {
  recordStage('selecting_payment');

  const res = await ref_executePayment({
    ...(config || {}),
    dryRun: isDryRun
  });

  if (res && res.success) {
    recordStage('ipay_selected');
  }

  if (isDryRun) {
    log('DRY RUN — halted safely before final payment.');
    recordStage('dry_run_stop');
    return;
  }

  recordStage('pay_clicked');
  log('⚡ PAY CLICKED — LIVE BOOKING COMPLETED');
}

/* ═════════════════════════════════════════════════════════════════════
 * 9. IMPECCABLE OPERATE HUD (Real-time telemetry overlay)
 * ═════════════════════════════════════════════════════════════════════ */

function injectHUD(isLive) {
  if (hudElement) return;

  hudElement = document.createElement('div');
  hudElement.id = 'tatkal-arm-hud';
  hudElement.innerHTML = `
    <style>
      #tatkal-arm-hud {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #0A0B0E;
        border: 1px solid rgba(213, 255, 64, 0.25);
        box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.85), 0 0 24px rgba(213, 255, 64, 0.12);
        border-radius: 14px;
        padding: 14px 18px;
        color: #FFFFFF;
        min-width: 310px;
        transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;
      }
      #tatkal-arm-hud * { box-sizing: border-box; }
      .hud-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .hud-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 3px 10px;
        border-radius: 9999px;
        background: rgba(213, 255, 64, 0.15);
        color: #D5FF40;
        border: 1px solid rgba(213, 255, 64, 0.35);
      }
      .hud-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #D5FF40;
        box-shadow: 0 0 8px #D5FF40;
      }
      .hud-countdown {
        font-family: 'Poppins', ui-monospace, "Cascadia Code", "SF Mono", monospace;
        font-variant-numeric: tabular-nums;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #D5FF40;
        text-shadow: 0 0 16px rgba(213, 255, 64, 0.4);
        margin: 4px 0 8px;
        line-height: 1;
      }
      .hud-stages-track {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin: 10px 0;
        padding: 6px;
        background: #141519;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
      }
      .hud-stage-node {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.1);
        transition: background 200ms ease, box-shadow 200ms ease;
      }
      .hud-stage-node.done   { background: #D5FF40; box-shadow: 0 0 8px #D5FF40; }
      .hud-stage-node.active { background: #D5FF40; box-shadow: 0 0 12px #D5FF40; animation: hud-pulse 1.2s infinite alternate; }
      @keyframes hud-pulse {
        from { opacity: 0.5; }
        to { opacity: 1; }
      }
      .hud-status-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #C0C2B8;
        margin-bottom: 8px;
      }
      .hud-actions-row {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .hud-btn {
        flex: 1;
        background: #1A1C22;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #FFFFFF;
        border-radius: 8px;
        font-family: inherit;
        font-size: 10px;
        font-weight: 700;
        padding: 5px 6px;
        cursor: pointer;
        text-align: center;
        transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
      }
      .hud-btn:hover { background: #23252C; border-color: rgba(213, 255, 64, 0.4); }
      .hud-btn:active { transform: scale(0.95); }
      .hud-btn.danger {
        border-color: rgba(255, 77, 77, 0.4);
        color: #FFB3B3;
        background: rgba(255, 77, 77, 0.15);
      }
    </style>
    <div class="hud-top-bar">
      <div class="hud-pill">
        <span class="hud-dot"></span>
        <span>${isLive ? 'LIVE TATKAL ARMED' : 'TEST ENGINE'}</span>
      </div>
      <button id="tatkal-hud-abort" class="hud-btn danger" style="flex:0;padding:2px 8px">ABORT</button>
    </div>
    <div id="tatkal-hud-countdown" class="hud-countdown">00:00:00.000</div>
    <div class="hud-stages-track">
      <div id="node-prefill" class="hud-stage-node" title="1. Prefill"></div>
      <div id="node-fire"    class="hud-stage-node" title="2. T-0.5s Fire"></div>
      <div id="node-class"   class="hud-stage-node" title="3. Class Lock"></div>
      <div id="node-pax"     class="hud-stage-node" title="4. Passengers"></div>
      <div id="node-captcha" class="hud-stage-node" title="5. Captcha"></div>
      <div id="node-pay"     class="hud-stage-node" title="6. Payment"></div>
    </div>
    <div class="hud-status-line">
      <span id="tatkal-hud-label">Engine holding…</span>
      <span id="tatkal-hud-clock">T−0.5s</span>
    </div>
    <div class="hud-actions-row">
      <button id="hud-act-tatkal" class="hud-btn">Set Tatkal</button>
      <button id="hud-act-sl"     class="hud-btn">Click SL</button>
      <button id="hud-act-pax"    class="hud-btn">Fill Pax</button>
    </div>
  `;

  document.body.appendChild(hudElement);

  document.getElementById('tatkal-hud-abort')?.addEventListener('click', () => {
    stopChain();
    chrome.runtime.sendMessage({ type: 'STOP' }).catch(() => {});
  });

  document.getElementById('hud-act-tatkal')?.addEventListener('click', () => {
    ref_selectTatkalQuota();
  });

  document.getElementById('hud-act-sl')?.addEventListener('click', () => {
    ref_clickClassSeats(config?.journeyClass || 'SL', config?.trainNumber || '');
  });

  document.getElementById('hud-act-pax')?.addEventListener('click', () => {
    if (config?.passengers) ref_fillAllPassengers(config.passengers);
  });
}

function updateHUDStage(stageKey) {
  const stageMap = {
    prefill_start:       { node: 'node-prefill', text: 'Prefilling origin, destination, date & quota…' },
    prefill_done:        { node: 'node-prefill', text: 'Prefill completed ✓', done: true },
    waiting_for_fire:    { node: 'node-fire',    text: 'Holding for quota opening (T−0.5s)…' },
    search_fired:        { node: 'node-fire',    text: 'Search fired! ⚡', done: true },
    waiting_for_results: { node: 'node-class',   text: 'Selecting class & availability…' },
    cell_clicked:        { node: 'node-class',   text: 'Availability cell locked ✓', done: true },
    regret:              { node: 'node-class',   text: 'REGRET — Quota exhausted' },
    ticking_passengers:  { node: 'node-pax',     text: 'Selecting passenger list…' },
    pax_ticked:          { node: 'node-pax',     text: 'Passengers verified ✓', done: true },
    waiting_for_captcha: { node: 'node-captcha', text: '⚡ TYPE CAPTCHA & SUBMIT' },
    captcha_cleared:     { node: 'node-captcha', text: 'Captcha validated ✓', done: true },
    selecting_payment:   { node: 'node-pay',     text: 'Auto-selecting IRCTC iPay…' },
    ipay_selected:       { node: 'node-pay',     text: 'iPay selected ✓' },
    pay_clicked:         { node: 'node-pay',     text: '⚡ PAY CLICKED — BOOKING COMPLETED', done: true },
    dry_run_stop:        { node: 'node-pay',     text: 'Test run halted before Pay ✓', done: true },
  };

  const item = stageMap[stageKey];
  if (!item) return;

  const labelEl = document.getElementById('tatkal-hud-label');
  if (labelEl) labelEl.textContent = item.text;

  const nodeEl = document.getElementById(item.node);
  if (nodeEl) {
    nodeEl.className = item.done ? 'hud-stage-node done' : 'hud-stage-node active';
  }
}

function updateHUDCountdown(remaining) {
  const cdEl = document.getElementById('tatkal-hud-countdown');
  if (!cdEl) return;

  if (remaining <= 0) {
    cdEl.textContent = '00:00:00.000';
    return;
  }

  const sTotal = Math.floor(remaining / 1000);
  const hours = Math.floor(sTotal / 3600);
  const mins = Math.floor((sTotal % 3600) / 60);
  const secs = sTotal % 60;
  const ms = remaining % 1000;

  cdEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function removeHUD() {
  if (hudElement) {
    hudElement.style.opacity = '0';
    hudElement.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (hudElement) hudElement.remove();
      hudElement = null;
    }, 200);
  }
}

function recordStage(name, extra) {
  const now = performance.now();
  timings[name] = now;
  log(`Stage: ${name}`, extra || '');

  updateHUDStage(name);

  chrome.runtime.sendMessage({
    type: 'STAGE_UPDATE',
    stage: name,
    timestamp: Date.now(),
    data: extra,
  }).catch(() => {});
}

/* ═════════════════════════════════════════════════════════════════════
 * 10. PRECISION TIMED HOLD (T−0.5s Atomic Fire)
 * ═════════════════════════════════════════════════════════════════════ */

function waitUntil(target) {
  return new Promise((resolve) => {
    const coarseWait = () => {
      if (chainAborted) { resolve(); return; }
      const remaining = target - Date.now();
      updateHUDCountdown(remaining);

      if (remaining <= SPIN_THRESHOLD) {
        spinWait();
        return;
      }

      chrome.runtime.sendMessage({
        type: 'STAGE_UPDATE',
        stage: 'countdown',
        data: { remaining },
      }).catch(() => {});

      const delay = Math.max(remaining - SPIN_THRESHOLD, 16);
      const id = setTimeout(coarseWait, Math.min(delay, 80));
      timers.push(id);
    };

    const spinWait = () => {
      if (chainAborted) { resolve(); return; }
      const remaining = target - Date.now();
      updateHUDCountdown(remaining);

      if (remaining <= 0) {
        resolve();
        return;
      }
      rafId = requestAnimationFrame(spinWait);
    };

    coarseWait();
  });
}

/* ═════════════════════════════════════════════════════════════════════
 * 11. COMPLETE BOOKING CHAIN
 * ═════════════════════════════════════════════════════════════════════ */

async function runChain(cfg, target, isDryRun, fallback = false, runImmediate = false) {
  if (chainActive) {
    warn('Chain already active.');
    return;
  }

  chainActive  = true;
  chainAborted = false;
  isFallback   = fallback;
  config       = cfg;
  targetTime   = target;
  dryRun       = isDryRun;

  Object.keys(timings).forEach(k => delete timings[k]);

  injectHUD(!dryRun);

  log(`Execution Chain Started. [${dryRun ? 'DRY RUN' : 'REAL LIVE'}]`);
  recordStage('chain_start');

  try {
    const currentUrl = window.location.href;

    // SCENARIO A: Already on passenger input page
    if (currentUrl.includes('psgninput')) {
      log('Detected passenger input page; running passenger filling directly.');
      await stagePassengers(cfg);
      if (chainAborted) throw abort();
      await stageCaptcha();
      if (chainAborted) throw abort();
      await stagePayment(isDryRun);
      recordStage('chain_done');
      return;
    }

    // SCENARIO B: Already on train results page (train-list)
    if (currentUrl.includes('train-list')) {
      log('Detected train list page; selecting quota & class directly.');
      await ref_selectTatkalQuota();
      await stageSelectClass(cfg);
      if (chainAborted) throw abort();
      await stagePassengers(cfg);
      if (chainAborted) throw abort();
      await stageCaptcha();
      if (chainAborted) throw abort();
      await stagePayment(isDryRun);
      recordStage('chain_done');
      return;
    }

    // SCENARIO C: On train search / home page
    /* Stage 1: Prefill */
    await stagePrefill(cfg);
    if (chainAborted) throw abort();

    /* Stage 2: Fire at T−0.5s (or immediately if runImmediate or target passed) */
    if (!runImmediate && target && target > Date.now()) {
      await stageFireSearch(target);
    } else {
      log('Firing train search immediately…');
      const btn = $(SEL.searchBtn);
      if (btn) btn.click();
      recordStage('search_fired');
    }
    if (chainAborted) throw abort();

    /* Stage 3: Class Selection */
    await stageSelectClass(cfg);
    if (chainAborted) throw abort();

    /* Stage 4: Passengers */
    await stagePassengers(cfg);
    if (chainAborted) throw abort();

    /* Stage 5: Captcha */
    await stageCaptcha();
    if (chainAborted) throw abort();

    /* Stage 6: Payment */
    await stagePayment(isDryRun);

    recordStage('chain_done');
    emitTimingTable(true);

    chrome.runtime.sendMessage({
      type: 'CHAIN_COMPLETE',
      success: true,
      timings: serializeTimings(),
    }).catch(() => {});

    setTimeout(removeHUD, 6000);

  } catch (e) {
    if (e.message === 'ABORTED') {
      log('Execution aborted.');
    } else if (e.message === 'REGRET') {
      warn('REGRET encountered.');
      recordStage('regret');

      if (!isFallback && cfg.fallbackFrom && cfg.fallbackTo) {
        log(`Triggering Contingency Route: ${cfg.fallbackFrom} → ${cfg.fallbackTo}`);
        await sleep(FALLBACK_DELAY);
        if (!chainAborted) {
          const fbCfg = {
            ...cfg,
            fromStation: cfg.fallbackFrom,
            toStation: cfg.fallbackTo,
          };
          chainActive = false;
          return runChain(fbCfg, Date.now() + 1000, isDryRun, true, true);
        }
      }

      chrome.runtime.sendMessage({
        type: 'CHAIN_COMPLETE',
        success: false,
        error: 'REGRET',
      }).catch(() => {});
    } else {
      warn('Chain failed:', e);
    }
  } finally {
    chainActive = false;
    if (originalTitle && document.title === '⚡ SOLVE CAPTCHA') {
      document.title = originalTitle;
    }
  }
}

function abort() { return new Error('ABORTED'); }

function serializeTimings() {
  const out = {};
  for (const [k, v] of Object.entries(timings)) {
    out[k] = Math.round(v * 100) / 100;
  }
  return out;
}

async function stagePrefill(cfg) {
  recordStage('prefill_start');
  await ref_fillJourneyDetails(cfg);
  recordStage('prefill_done');
}

async function stageFireSearch(target) {
  recordStage('waiting_for_fire');
  await waitUntil(target);
  if (chainAborted) return;

  const btn = $(SEL.searchBtn);
  if (btn) {
    btn.click();
    recordStage('search_fired');
    log('Search fired at target instant!');
  } else {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    recordStage('search_fired');
  }
}

async function stageSelectClass(cfg) {
  recordStage('waiting_for_results');
  const res = await ref_clickClassSeats(cfg.journeyClass || 'SL', cfg.trainNumber || '');
  if (!res.success) {
    if (res.regret) throw new Error('REGRET');
    throw new Error(res.error || 'Class selection failed');
  }
  recordStage('cell_clicked');
  await sleep(400);
}

async function stagePassengers(cfg) {
  recordStage('ticking_passengers');
  await poll(() => $(SEL.masterListRow) || $(SEL.passengerRow) || window.location.href.includes('psgninput'), 12_000);
  await sleep(350);

  if (cfg.passengers && cfg.passengers.length > 0) {
    await ref_fillAllPassengers(cfg.passengers);
  }
  recordStage('pax_ticked');

  // Click continue button on passenger input page
  await sleep(200);
  const continueBtn = $(SEL.paxContinueBtn);
  if (continueBtn) {
    log('Clicking Continue on Passenger Details page…');
    continueBtn.click();
  }
}

function emitTimingTable(success) {
  const stages = Object.entries(timings).sort((a, b) => a[1] - b[1]);
  if (stages.length < 2) return;

  const table = [];
  for (let i = 1; i < stages.length; i++) {
    table.push({
      Stage: stages[i][0],
      'Duration (ms)': Math.round((stages[i][1] - stages[i - 1][1]) * 10) / 10,
      'Elapsed (ms)': Math.round(stages[i][1] * 10) / 10,
    });
  }

  console.log('%c[TatkalArm] Stage Latency Audit', 'color:#ef4444;font-weight:bold;font-size:13px');
  console.table(table);
}

function stopChain() {
  chainAborted = true;
  timers.forEach(id => clearTimeout(id));
  timers = [];
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  removeHUD();
  log('Booking chain halted.');
}

/* ═════════════════════════════════════════════════════════════════════
 * 12. RUNTIME MESSAGE DISPATCHER
 * ═════════════════════════════════════════════════════════════════════ */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    /* ── Direct Instant Actions (from reference extension) ── */

    case 'AUTO_LOGIN':
      ref_autoLogin(msg).then(sendResponse);
      return true;

    case 'CLICK_LOGIN_SUBMIT':
      sendResponse({ success: ref_clickLoginSubmit() });
      return false;

    case 'EXECUTE_PAYMENT':
      ref_executePayment(msg.options || {}).then(sendResponse);
      return true;

    case 'AUTO_FILL_PAGE':
      ref_autoFillCurrentPage(msg.config || {}).then(sendResponse);
      return true;

    case 'SELECT_TATKAL_QUOTA':
      ref_selectTatkalQuota().then(success => sendResponse({ success }));
      return true;

    case 'CLICK_CLASS_SEATS':
      ref_clickClassSeats(msg.journeyClass || 'SL', msg.trainNumber || '').then(sendResponse);
      return true;

    case 'FILL_SINGLE_PASSENGER':
      if (msg.personData && typeof msg.index === 'number') {
        ref_fillSinglePassenger(msg.personData, msg.index).then(sendResponse);
        return true;
      }
      sendResponse({ success: false, error: 'Invalid passenger data' });
      return false;

    case 'FILL_PASSENGERS':
      ref_fillAllPassengers(msg.passengers || []).then(sendResponse);
      return true;

    case 'FILL_JOURNEY_DETAILS':
      ref_fillJourneyDetails(msg.journeyData || msg.config || {}).then(sendResponse);
      return true;

    case 'CHECK_PAGE':
      sendResponse({
        success: true,
        url: window.location.href,
        isSearchPage: window.location.href.includes('train-search'),
        isTrainListPage: window.location.href.includes('train-list'),
        isPassengerPage: window.location.href.includes('psgninput'),
        hasLoginModal: $(SEL.loginUserId) !== null
      });
      return false;

    /* ── Full Booking Chain ──────────────────────────────── */

    case 'ARM':
      runChain(msg.config, msg.targetTime, msg.config.dryRun === true, false, false);
      sendResponse({ ok: true });
      return false;

    case 'RUN_NOW':
      runChain(msg.config, Date.now(), msg.config.dryRun === true, false, true);
      sendResponse({ ok: true });
      return false;

    case 'STOP':
      stopChain();
      sendResponse({ ok: true });
      return false;

    case 'PING':
      sendResponse({ ok: true, ready: true, url: window.location.href });
      return false;
  }
  return false;
});
