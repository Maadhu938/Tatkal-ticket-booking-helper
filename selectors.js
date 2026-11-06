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
  loginModalTrigger: 'button.btn-login, button.btn-login.ng-star-inserted, a.search_btn.loginText, a[aria-label="Click here to Login"], a.loginText, a:has(span.fa-user), .h_menu_drop_button a',
  loginDialog:       '#newLogin, .login-dialog, .login-wrapper, app-login, p-dialog[header="Login"], .ui-dialog, .p-dialog, .irmodal',
  loginUserId:       'input[formcontrolname="userid"], input#username, input#userId, input[name="userId"], input[placeholder*="User" i]',
  loginPassword:     'input[formcontrolname="password"], input#password, input#pwd, input[name="pwd"], input[type="password"]',
  loginCaptchaInput: '#captcha, input[formcontrolname="captcha"], input[name="captcha"], input[placeholder*="Captcha" i], input[placeholder*="CAPTCHA"]',
  loginSubmitBtn:    'button.button-primary[type="submit"], button.button-primary, app-login button.search_btn.train_Search, app-login button[type="submit"], button.search_btn.train_Search, button[type="submit"].search_btn, button.train_Search, button.search_btn, button.btnDefault.train_Search, app-login button',

  /* ── 2. Journey Search Form (train-search: classic nget & modern eticket) ─ */

  // Origin station autocomplete
  fromInput:         'div.field-box[aria-label="From station"] input, input.station-search-input, p-autocomplete[formcontrolname="origin"] input, #origin input, p-autocomplete[id="origin"] input, input[placeholder*="From*" i]',
  fromSuggestions:   '.custom-dropdown-panel .custom-option, li[role="option"], #origin .ui-autocomplete-panel li, .p-autocomplete-panel li, .ui-autocomplete-list-item',

  // Destination station autocomplete
  toInput:           'div.field-box[aria-label="To station"] input, input.station-search-input, p-autocomplete[formcontrolname="destination"] input, #destination input, p-autocomplete[id="destination"] input, input[placeholder*="To*" i]',
  toSuggestions:     '.custom-dropdown-panel .custom-option, li[role="option"], #destination .ui-autocomplete-panel li, .p-autocomplete-panel li, .ui-autocomplete-list-item',

  // Journey date calendar
  dateInput:         'div.field-box[aria-label="Select travel date"] input, p-calendar[formcontrolname="journeyDate"] input, p-calendar input, input[name="journeyDate"], input[placeholder*="DD/MM/YYYY" i]',
  datePickerActiveDay: '.ui-datepicker-current-day a, .ui-state-highlight, .p-datepicker-today a, td:not(.ui-datepicker-other-month) a',

  // Class dropdown
  classDropdown:     'div.field-box[aria-label*="Class" i], p-dropdown[formcontrolname="journeyClass"], #journeyClass, p-dropdown[id="journeyClass"]',

  // Quota dropdown (Works on train-search AND train-list top bar)
  quotaDropdown:     'div.field-box[aria-label="Quota"], p-dropdown[formcontrolname="journeyQuota"], #journeyQuota, p-dropdown#journeyQuota, .search_div p-dropdown',
  dropdownTrigger:   '.ui-dropdown-trigger, .p-dropdown-trigger',
  dropdownPanel:     '.custom-dropdown-panel, .custom-dropdown-panel-quota, .ui-dropdown-panel, .p-dropdown-panel',
  dropdownItems:     '.custom-option, .ui-dropdown-item, .p-dropdown-item, li[role="option"]',

  // Checkboxes
  flexibleDateCheck:   'input#dateSpecific[formcontrolname="dateSpecific"], input#dateSpecific',
  availableBerthCheck: 'input#availableBerth[formcontrolname="availableBerth"], input#availableBerth',

  // Search button
  searchBtn:         'app-jp-input button.search-btn, button.search-btn[type="submit"], button.search_btn[type="submit"], button.search_btn, button[label="Find Trains"], button[aria-label="Find Trains"]',

  /* ── 3. Train Results / Availability Matrix (train-list) ──────────── */

  // Train card / container
  trainRow:          'app-train-avl-enq, .train-card__main, .train-heading, .form-group.no-pad.col-xs-12, .train-listing, .train-list-container',
  trainNumber:       '.train-number, .train-heading strong, strong.train-no, .train-heading span, .strong',
  trainName:         '.train-name, .train-heading span',

  // Class boxes inside train card (e.g. Sleeper (SL), AC 3 Tier (3A))
  classBox:          '.class-card, .pre-avl, td.pre-avl, div.pre-avl, .col-xs-12 .pre-avl, div[tabindex]',
  classTitle:        '.class-code, .classMaster, .col-class-heading, strong, span',
  classRefreshLink:  'button.btn-availability, .class-card .sync-icon, div.pre-avl .link, div.link, .fa-repeat',

  // Availability cells & Book button
  availCell:         'button.btn-availability, .pre-avl.link, td.pre-avl.link, .availability-table td, div.pre-avl, .class-status',
  bookNowBtn:        'button.btn-book, button.btnDefault.train_Search, button.train_Search, button.btn-primary, button:has-text("Book Now")',

  // Confirmation dialog (e.g. "Do you want to proceed?")
  confirmDialogYes:  '.bc-btn-continue, button.bc-btn-continue, button.ui-confirmdialog-yes, button.p-confirm-dialog-accept, .ui-dialog-footer button.ui-button-success, .p-dialog-footer button.p-button-success',

  /* ── 4. Passenger Details Page (/psgninput) ───────────────────────── */

  // Master List / Saved Passengers strategy (Classic nget and Modern eticket)
  masterListRow:     '.ep-passenger-row, app-passenger .ui-grid-row, app-passenger .p-grid, .passengerDetails .psgn-row, .ui-table-tbody tr',
  masterListCheck:   '.ep-passenger-row .ui-chkbox-box, p-checkbox .ui-chkbox-box, p-checkbox .p-checkbox-box, input[type="checkbox"]',
  masterListName:    '.ep-passenger-name, .psgn-name, .ui-grid-col-4 span, .p-col span, td:first-child',
  existingModalBtn:  'button.btn-existing',
  existingModalMask: '.ep-modal-mask, section.ep-modal-panel',
  existingModalAdd:  'button.ep-add-btn',

  // Direct app-passenger form strategy
  passengerRow:              'app-passenger, .passenger-card',
  addPassengerBtn:           'button.btn-new-passenger, a span.prenext, button.add-passenger-btn, a:has(span.prenext)',
  passengerNameInput:        'p-autocomplete[formcontrolname="passengerName"] input, input[formcontrolname="passengerName"], p-autocomplete input[placeholder*="Name"], p-autocomplete input',
  passengerAgeInput:         'input[formcontrolname="passengerAge"], input[placeholder*="Age"]',
  passengerGenderSelect:     'p-dropdown[formcontrolname="passengerGender"], select[formcontrolname="passengerGender"]',
  passengerNationalitySelect:'p-dropdown[formcontrolname="passengerNationality"], select[formcontrolname="passengerNationality"]',
  passengerBerthSelect:      'p-dropdown[formcontrolname="passengerBerthChoice"], select[formcontrolname="passengerBerthChoice"], p-dropdown[formcontrolname="berthChoice"]',

  // Preferences & Other Preferences Accordion
  otherPreferencesHeader:    'div.section-header[aria-controls="bookingPreferencesBody"], button.pref-collapse-button, .section-header',
  otherPreferencesBody:      '#bookingPreferencesBody, .pref-body',
  bookOnlyIfCnfCheck:        'p-checkbox[formcontrolname="bookOnlyIfCnf"], p-checkbox[name="confirmBerth"], input[name="confirmBerth"], input#confirmberths',
  autoUpgradationCheck:      'input#autoUpgradation[formcontrolname="autoUpgradation"], input#autoUpgradation, p-checkbox[formcontrolname="autoUpgradation"]',
  confirmBerthsCheck:        'input#confirmberths[formcontrolname="confirmberths"], input#confirmberths',
  travelInsuranceRadio:      'p-radiobutton[inputid="insuranceYes"] .ui-radiobutton-box, input#insuranceYes, #insuranceYes',
  loyaltySkipRadio:          '#lo-3, label[for="lo-3"], input[name="loyalityOperationType"][value="3"]',

  // Payment Option selection on passenger input page (UPI vs Credit Card / NetBanking)
  paymentOptionUPI:          '#payment-option-1, input[name="payment"][value="2"], p-radiobutton[inputid="2"] .ui-radiobutton-box, input#2, #2',
  paymentOptionCards:        '#payment-option-0, input[name="payment"][value="3"], p-radiobutton[inputid="1"] .ui-radiobutton-box, input#1, #1',

  // Calculate fare & Continue button on passenger details
  calculateFareBtn:          'button.btn-calc-fare, .review-actions button.btn-calc-fare',
  paxContinueBtn:            'button.btn-payment, button.train_Search[type="submit"], button.btnDefault.train_Search, button[type="submit"].btn-primary',

  /* ── 5. Captcha Verification & Review Page ────────────────────────── */

  captchaImage:      'app-captcha img, .captcha-img img, img.captcha-img, #captcha-img',
  captchaInput:      '#captcha, input[name="captchaInput"], app-captcha input[type="text"], input[formcontrolname="captchaInput"]',
  reviewContinueBtn: 'button.btn-payment, button[type="submit"].train_Search, button.btnDefault.train_Search, button.train_Search',
  reviewConfirmContinue: '.bc-btn-continue, button.bc-btn-continue',

  /* ── 6. Payment Selection & Execution ─────────────────────────────── */

  // IRCTC iPay radio & wallet option
  ipayRadio:         'input[value*="IPAY"], input[value*="ipay"], input[name*="paymentType"][value*="WALLET"], .ipay-card',
  ipayLabel:         '.bank-text, .payment-type label, label[for*="IPAY"], label[for*="ipay"], .ipay-card',
  payBtn:            'button.btn-payment, button.btn.btn-primary.btn-lg.ng-star-inserted, button.pay-btn, button[label="Pay & Book"], button[type="submit"].btn-primary, button.btn-success',

  /* ── 7. Overlays, Spinners & Interruption Dialogs ─────────────────── */

  overlay:           '.ui-blockui, .p-blockui, .cdk-overlay-backdrop, .loading-bg, .spinner',

  // Modals to auto-dismiss
  languageDialog:    '.ui-dialog-content .pnr-detail, .ui-dialog-content, .ui-dialog.ui-widget',
  languageEnglishBtn: '.ui-dialog-content button.btn-primary, .ui-dialog button.btn-primary',
  homeTourSkipBtn:   '.home-tour-actions .home-tour-skip, button.home-tour-skip, .home-tour-skip',
  sessionRestoreOverlay: 'app-book-now-confirmation .bc-overlay, .bc-overlay',
  highLoadClose:     '.fa.fa-close, span.fa-close, .fa-close'
});
