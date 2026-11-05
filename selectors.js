/**
 * selectors.js — Centralised IRCTC DOM Selectors.
 *
 * Fully mapped to IRCTC PrimeNG (Angular) component tree across:
 *   1. Authentication (Header Login trigger & Login Dialog)
 *   2. Journey Search Form (Origin, Destination, Date, Class, Quota)
 *   3. Train Results / Availability Matrix (Quota toggle, Class tabs, Availability cells, Book Now)
 *   4. Passenger Input Page (Master List checkboxes & Direct app-passenger forms)
 *   5. Captcha Verification & Audio Cue
 *   6. Payment Selection (IRCTC iPay Wallet & BHIM UPI)
 */

'use strict';

/* eslint-disable no-unused-vars */
const SEL = Object.freeze({

  /* ── 1. Authentication ────────────────────────────────────────────── */

  // Header login button (to open modal if closed)
  loginModalTrigger: 'a.search_btn.loginText, a[aria-label="Click here to Login"], a.loginText, a:has(span.fa-user)',
  loginDialog:       'app-login, p-dialog[header="Login"], .ui-dialog, .p-dialog',
  loginUserId:       'input[formcontrolname="userid"], input#userId, input[name="userId"]',
  loginPassword:     'input[formcontrolname="password"], input#pwd, input[name="pwd"]',
  loginCaptchaInput: '#captcha, input[formcontrolname="captcha"], input[name="captcha"]',
  loginSubmitBtn:    'app-login button.search_btn.train_Search, app-login button[type="submit"], button.search_btn.train_Search, button[type="submit"].search_btn, button.train_Search, button.search_btn, button.btnDefault.train_Search, app-login button',

  /* ── 2. Journey Search Form (train-search) ────────────────────────── */

  // Origin station autocomplete
  fromInput:         'p-autocomplete[formcontrolname="origin"] input, #origin input, p-autocomplete[id="origin"] input, input[placeholder*="From*"]',
  fromSuggestions:   'li[role="option"], #origin .ui-autocomplete-panel li, .p-autocomplete-panel li, .ui-autocomplete-list-item',

  // Destination station autocomplete
  toInput:           'p-autocomplete[formcontrolname="destination"] input, #destination input, p-autocomplete[id="destination"] input, input[placeholder*="To*"]',
  toSuggestions:     'li[role="option"], #destination .ui-autocomplete-panel li, .p-autocomplete-panel li, .ui-autocomplete-list-item',

  // Journey date calendar
  dateInput:         'p-calendar[formcontrolname="journeyDate"] input, p-calendar input, input[name="journeyDate"]',
  datePickerActiveDay: '.ui-datepicker-current-day a, .ui-state-highlight, .p-datepicker-today a, td:not(.ui-datepicker-other-month) a',

  // Class dropdown
  classDropdown:     'p-dropdown[formcontrolname="journeyClass"], #journeyClass, p-dropdown[id="journeyClass"]',

  // Quota dropdown (Works on train-search AND train-list top bar)
  quotaDropdown:     'p-dropdown[formcontrolname="journeyQuota"], #journeyQuota, p-dropdown#journeyQuota, .search_div p-dropdown',
  dropdownTrigger:   '.ui-dropdown-trigger, .p-dropdown-trigger',
  dropdownPanel:     '.ui-dropdown-panel, .p-dropdown-panel',
  dropdownItems:     '.ui-dropdown-item, .p-dropdown-item, li[role="option"]',

  // Checkboxes
  flexibleDateCheck:   'input#dateSpecific[formcontrolname="dateSpecific"], input#dateSpecific',
  availableBerthCheck: 'input#availableBerth[formcontrolname="availableBerth"], input#availableBerth',

  // Search button
  searchBtn:         'button.search_btn[type="submit"], button.search_btn, button[label="Find Trains"], button[aria-label="Find Trains"]',

  /* ── 3. Train Results / Availability Matrix (train-list) ──────────── */

  // Train card / container
  trainRow:          'app-train-avl-enq, .train-heading, .form-group.no-pad.col-xs-12, .train-listing',
  trainNumber:       '.train-heading strong, strong.train-no, .train-heading span, .strong',

  // Class boxes inside train card (e.g. Sleeper (SL), AC 3 Tier (3A))
  classBox:          '.pre-avl, td.pre-avl, div.pre-avl, .col-xs-12 .pre-avl, div[tabindex]',
  classTitle:        '.classMaster, .col-class-heading, strong, span',

  // Availability cells & Book button
  availCell:         '.pre-avl.link, td.pre-avl.link, .availability-table td, div.pre-avl',
  bookNowBtn:        'button.btnDefault.train_Search, button.train_Search, button.btn-primary, button:has-text("Book Now")',

  // Confirmation dialog (e.g. "Do you want to proceed?")
  confirmDialogYes:  'button.ui-confirmdialog-yes, button.p-confirm-dialog-accept, .ui-dialog-footer button.ui-button-success, .p-dialog-footer button.p-button-success',

  /* ── 4. Passenger Details Page (/psgninput) ───────────────────────── */

  // Master List strategy
  masterListRow:     'app-passenger .ui-grid-row, app-passenger .p-grid, .passengerDetails .psgn-row, .ui-table-tbody tr',
  masterListCheck:   'p-checkbox .ui-chkbox-box, p-checkbox .p-checkbox-box, input[type="checkbox"]',
  masterListName:    '.psgn-name, .ui-grid-col-4 span, .p-col span, td:first-child',

  // Direct app-passenger form strategy
  passengerRow:              'app-passenger',
  addPassengerBtn:           'a span.prenext, button.add-passenger-btn, a:has(span.prenext)',
  passengerNameInput:        'p-autocomplete input[placeholder*="Name"], p-autocomplete input, input[formcontrolname="passengerName"]',
  passengerAgeInput:         'input[formcontrolname="passengerAge"]',
  passengerGenderSelect:     'select[formcontrolname="passengerGender"], p-dropdown[formcontrolname="passengerGender"]',
  passengerNationalitySelect:'select[formcontrolname="passengerNationality"], p-dropdown[formcontrolname="passengerNationality"]',
  passengerBerthSelect:      'select[formcontrolname="passengerBerthChoice"], p-dropdown[formcontrolname="passengerBerthChoice"]',

  // Preferences
  autoUpgradationCheck:      'input#autoUpgradation[formcontrolname="autoUpgradation"], input#autoUpgradation',
  confirmBerthsCheck:        'input#confirmberths[formcontrolname="confirmberths"], input#confirmberths',
  travelInsuranceRadio:      'p-radiobutton[inputid="insuranceYes"] .ui-radiobutton-box, input#insuranceYes, #insuranceYes',

  // Payment Option selection on passenger input page (UPI vs Credit Card / NetBanking)
  paymentOptionUPI:          'p-radiobutton[inputid="2"] .ui-radiobutton-box, input#2, #2',
  paymentOptionCards:        'p-radiobutton[inputid="1"] .ui-radiobutton-box, input#1, #1',

  // Continue button on passenger details
  paxContinueBtn:            'button.train_Search[type="submit"], button.btnDefault.train_Search, button[type="submit"].btn-primary',

  /* ── 5. Captcha Verification Page ─────────────────────────────────── */

  captchaImage:      'app-captcha img, .captcha-img img, img.captcha-img, #captcha-img',
  captchaInput:      '#captcha, input[name="captchaInput"], app-captcha input[type="text"], input[formcontrolname="captchaInput"]',
  reviewContinueBtn: 'button[type="submit"].train_Search, button.btnDefault.train_Search, button.train_Search',

  /* ── 6. Payment Selection & Execution ─────────────────────────────── */

  // IRCTC iPay radio & wallet option
  ipayRadio:         'input[value*="IPAY"], input[value*="ipay"], input[name*="paymentType"][value*="WALLET"]',
  ipayLabel:         '.bank-text, .payment-type label, label[for*="IPAY"], label[for*="ipay"]',
  payBtn:            'button.btn.btn-primary.btn-lg.ng-star-inserted, button.pay-btn, button[label="Pay & Book"], button[type="submit"].btn-primary, button.btn-success',

  /* ── 7. Overlays & Spinners ───────────────────────────────────────── */

  overlay:           '.ui-blockui, .p-blockui, .cdk-overlay-backdrop, .loading-bg, .spinner'
});
