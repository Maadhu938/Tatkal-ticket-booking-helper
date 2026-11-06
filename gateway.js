/**
 * gateway.js — Tatkal Arm External Payment Gateway Automator.
 *
 * Runs on:
 *   - https://www.irctcipay.com/*
 *   - https://pg.irctcpayments.com/*
 *   - https://mercury.phonepe.com/*
 *   - https://mercury-t2.phonepe.com/*
 *
 * Automatically selects preferred payment instruments (AutoPay, Debit/Credit Card, UPI)
 * and safely autofills card details or triggers UPI QR, eliminating frantic typing on bank pages.
 */

'use strict';

(function () {
  function log(...args) {
    console.log('%c[TatkalArm Gateway]', 'color:#D5FF40;font-weight:bold;background:#18181b;padding:2px 6px;border-radius:3px', ...args);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setNativeValue(element, value) {
    if (!element) return;
    const proto = HTMLInputElement.prototype;
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

  function triggerClick(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      el.focus();
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      el.click();
    } catch (_) {
      try { el.click(); } catch (e) {}
    }
  }

  async function poll(fn, timeout = 15000, interval = 200) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const res = fn();
        if (res) return res;
      } catch (_) {}
      await sleep(interval);
    }
    return null;
  }

  /* ── 1. IRCTC iPay Gateway Handler ─────────────────────────────────── */
  async function handleIrctcIpay(config) {
    log('Detected IRCTC iPay gateway. Initializing automation…');
    const method = config.paymentMethod || 'cards';

    // Wait for payment navigation container
    const nav = await poll(() => document.querySelector('#paymentNavs, #autoDebit, #autoDebitLi, .tab_menu'), 15000);
    if (!nav) {
      log('Payment navigation container not found.');
      return;
    }

    if (method === 'cards') {
      const cardType = config.cardType || 'debit'; // 'debit' | 'credit'
      const radioSelector = cardType === 'credit' ? '#mandateCCOTM, input[value="CCOTM"]' : '#mandateDCOTM, input[value="DCOTM"]';

      // Ensure AutoPay/Card tab is active
      const autoDebitTab = document.querySelector('#autoDebitLi, #autoDebit');
      if (autoDebitTab && !autoDebitTab.classList.contains('activeLi')) {
        triggerClick(autoDebitTab);
        await sleep(350);
      }

      // Select Card radio
      const radio = document.querySelector(radioSelector);
      if (radio && !radio.checked) {
        triggerClick(radio.closest('label') || radio);
        await sleep(300);
      }

      // Locate card input fields (support both normal and mandate forms)
      const numberEl = await poll(() => {
        return document.querySelector('#mndtCardNo, #altCardNo, input[name="cardNo"], input[placeholder*="Card Number" i]');
      }, 8000);

      if (numberEl && config.cardNumber) {
        log('Populating card number…');
        setNativeValue(numberEl, config.cardNumber.replace(/\s+/g, ''));
        await sleep(100);

        const expEl = document.querySelector('#mandateDate, #altExpDate, input[name="expDate"], input[placeholder*="MM/YY" i]');
        if (expEl && config.cardExpiry) {
          log('Populating card expiry…');
          setNativeValue(expEl, config.cardExpiry);
          await sleep(80);
        }

        const cvvEl = document.querySelector('#mandateCvv, #altCvv, input[name="cvv2"], input[placeholder*="CVV" i]');
        if (cvvEl && config.cardCvv) {
          log('Populating card CVV…');
          setNativeValue(cvvEl, config.cardCvv);
          await sleep(80);
        }

        const nameEl = document.querySelector('#mandateName, #altCardName, input[name="cardName"], input[placeholder*="Name" i]');
        if (nameEl && config.cardName) {
          log('Populating cardholder name…');
          setNativeValue(nameEl, config.cardName);
          await sleep(80);
        }

        log('Card fields successfully pre-filled on IRCTC iPay.');
      }
    } else if (method === 'upi') {
      const upiRadio = document.querySelector('#mandateUPI, #upiLi, input[value="UPI"]');
      if (upiRadio) {
        log('Selecting UPI instrument on IRCTC iPay…');
        triggerClick(upiRadio.closest('label') || upiRadio);
      }
    }
  }

  /* ── 2. PhonePe Gateway Handler ────────────────────────────────────── */
  async function handlePhonePe(config) {
    log('Detected PhonePe payment gateway. Initializing automation…');
    const method = config.paymentMethod || 'upi';

    // Wait for PhonePe payment instrument container
    const isReady = await poll(() => {
      return document.querySelector('#card-instrument, #upi-instrument, ._selected_1cewd_32, [class*="instrumentContainer"]');
    }, 20000);

    if (!isReady) {
      log('PhonePe payment options not visible.');
      return;
    }

    if (method === 'upi') {
      const upiOption = document.querySelector('#upi-instrument, [id*="upi"], div[aria-label*="UPI" i]');
      if (upiOption) {
        log('Selecting UPI on PhonePe…');
        triggerClick(upiOption);
      }
    } else if (method === 'cards') {
      const cardOption = document.querySelector('#card-instrument, div[aria-label*="Card" i]');
      if (cardOption) {
        log('Selecting Cards on PhonePe…');
        triggerClick(cardOption);
        await sleep(400);

        const numberInput = document.querySelector('input[name="cardNumber"], input[autocomplete="cc-number"], input[placeholder*="Card Number" i]');
        if (numberInput && config.cardNumber) {
          setNativeValue(numberInput, config.cardNumber.replace(/\s+/g, ''));
          await sleep(100);

          const expInput = document.querySelector('input[name="cardExpiry"], input[autocomplete="cc-exp"], input[placeholder*="MM" i]');
          if (expInput && config.cardExpiry) {
            setNativeValue(expInput, config.cardExpiry);
            await sleep(80);
          }

          const cvvInput = document.querySelector('input[name="cardCvv"], input[autocomplete="cc-csc"], input[placeholder*="CVV" i]');
          if (cvvInput && config.cardCvv) {
            setNativeValue(cvvInput, config.cardCvv);
          }
          log('Card fields pre-filled on PhonePe.');
        }
      }
    }
  }

  /* ── Bootstrap ──────────────────────────────────────────────────────── */
  async function init() {
    try {
      const host = window.location.hostname;
      const data = await chrome.storage.local.get(['tatkal_config', 'tatkal_profiles', 'active_profile_id']);
      let config = data.tatkal_config || {};

      // If multi-profile exists, resolve active profile
      if (Array.isArray(data.tatkal_profiles) && data.active_profile_id) {
        const found = data.tatkal_profiles.find(p => p.id === data.active_profile_id);
        if (found && found.config) config = { ...config, ...found.config };
      } else if (data.tatkal_profiles && data.active_profile_id && data.tatkal_profiles[data.active_profile_id]) {
        config = { ...config, ...data.tatkal_profiles[data.active_profile_id] };
      }

      if (host.includes('irctcipay.com') || host.includes('irctcpayments.com')) {
        await handleIrctcIpay(config);
      } else if (host.includes('phonepe.com')) {
        await handlePhonePe(config);
      }
    } catch (err) {
      console.warn('[TatkalArm Gateway] Initialization note:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
