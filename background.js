/**
 * background.js — Tatkal Arm Service Worker (Live Engine & Message Router).
 *
 * Responsibilities:
 *   1. Atomic clock sync with timeapi.io
 *   2. Compute fire instant for Tatkal quota (10:00:00 / 11:00:00 IST minus 500ms)
 *   3. Relay ARM / RUN_NOW / STOP and direct action messages to content script
 *   4. Persist runtime state in chrome.storage.local
 */

'use strict';

/* ── Constants ──────────────────────────────────────────────────────── */

const TIME_API_URL = 'https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata';
const AC_CLASSES   = new Set(['1A', '2A', '3A', 'CC', 'EC']);
const FIRE_OFFSET  = -500; // ms before quota opens

/* ── State ──────────────────────────────────────────────────── */

let clockOffset = 0; // local − server, in ms
let clockSynced = false;
let armed       = false;
let targetTime  = null;
let activeTabId = null;

/* ── Logging ────────────────────────────────────────────────────────── */

function log(...args)  { console.log('[TatkalArm:bg]', ...args); }
function warn(...args) { console.warn('[TatkalArm:bg]', ...args); }

/* ── Atomic Clock Sync ──────────────────────────────────────────────── */

async function syncClock() {
  try {
    const t0 = Date.now();
    const res = await fetch(TIME_API_URL, { cache: 'no-store' });
    const t1 = Date.now();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const serverMs = new Date(data.dateTime).getTime();
    const rtt = t1 - t0;
    const localAtServer = t0 + rtt / 2;
    clockOffset = localAtServer - serverMs;
    clockSynced = true;
    log(`Clock synced with timeapi.io. Offset: ${clockOffset}ms, RTT: ${rtt}ms`);
    return clockOffset;
  } catch (e) {
    warn('Clock sync fallback to local clock:', e.message);
    clockOffset = 0;
    clockSynced = false;
    return 0;
  }
}

/**
 * Compute the fire instant for a given config:
 * Target = (travelDate − 1 day) @ (10:00 or 11:00 IST) − 500ms, adjusted by clock offset.
 */
function computeTarget(config) {
  if (config.dryRun) {
    const fuse = config.testFuseMs || 10_000;
    return Date.now() + fuse;
  }

  const hour = AC_CLASSES.has(config.journeyClass) ? 10 : 11;
  const [y, m, d] = (config.travelDate || '').split('-').map(Number);
  if (!y || !m || !d) return Date.now() + 500;

  // IST = UTC+5:30. Convert IST hour to UTC
  const utcHour   = hour - 5;
  const utcMinute = -30;
  const bookingDate = new Date(Date.UTC(y, m - 1, d - 1, utcHour, utcMinute, 0, 0));

  const openMs = bookingDate.getTime();
  const target = openMs + FIRE_OFFSET - clockOffset;

  const now = Date.now();
  if (target < now) {
    // If target already passed (e.g. testing during active Tatkal window), return now + 100ms
    log('Target instant already passed; executing immediately.');
    return now + 100;
  }

  log(`Target computed: ${new Date(target).toISOString()} (IST hour ${hour})`);
  return target;
}

/* ── Find IRCTC Tab Helper ──────────────────────────────────────────── */

async function getIRCTCTab(preferredSite = null) {
  try {
    const marker = preferredSite === 'nget' ? '/nget/' : (preferredSite === 'eticket' ? '/eticket/' : null);

    // 1. Check current window for matching portal tab first
    const windowTabs = await chrome.tabs.query({ currentWindow: true });
    if (marker) {
      const matchInWindow = windowTabs.find(t => t.url && t.url.includes(marker));
      if (matchInWindow) return matchInWindow;
    }
    const anyInWindow = windowTabs.find(t => t.url && t.url.includes('irctc.co.in'));
    if (anyInWindow) return anyInWindow;

    // 2. Try active tab across all windows
    const activeTabs = await chrome.tabs.query({ url: '*://*.irctc.co.in/*', active: true });
    if (activeTabs.length > 0) {
      if (marker) {
        const matchActive = activeTabs.find(t => t.url && t.url.includes(marker));
        if (matchActive) return matchActive;
      }
      return activeTabs[0];
    }

    // 3. Try any tab with url match
    const allTabs = await chrome.tabs.query({ url: '*://*.irctc.co.in/*' });
    if (allTabs.length > 0) {
      if (marker) {
        const match = allTabs.find(t => t.url && t.url.includes(marker));
        if (match) return match;
      }
      return allTabs[0];
    }

    // 4. Fallback search all open tabs
    const allAnyTabs = await chrome.tabs.query({});
    const matched = allAnyTabs.find(t => t.url && t.url.includes('irctc.co.in'));
    return matched || null;
  } catch (err) {
    warn('getIRCTCTab error:', err);
    return null;
  }
}

/* ── Message Handling ───────────────────────────────────────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse);
  return true; // async response
});

async function handleMessage(msg, sender) {
  switch (msg.type) {

    /* ── ARM Booking Chain (Timed) ── */

    case 'ARM': {
      const cfg = await loadConfig();
      if (!cfg) return { ok: false, error: 'No config saved. Open Settings to configure.' };

      const tab = await getIRCTCTab(cfg.bookingSite);
      if (!tab) return { ok: false, error: 'No IRCTC tab found. Open irctc.co.in first.' };
      activeTabId = tab.id;

      await syncClock();
      targetTime = computeTarget(cfg);
      armed = true;

      await chrome.storage.local.set({
        _armed: true,
        _targetTime: targetTime,
        _clockOffset: clockOffset,
        _clockSynced: clockSynced,
      });

      try {
        await chrome.tabs.sendMessage(activeTabId, {
          type: 'ARM',
          config: cfg,
          targetTime,
          clockOffset,
          clockSynced,
          isLive: cfg.dryRun !== true,
        });
      } catch (e) {
        armed = false;
        await chrome.storage.local.set({ _armed: false });
        return { ok: false, error: 'Content script not responding. Refresh the IRCTC tab.' };
      }

      log('ARMED successfully.');
      return { ok: true, targetTime, dryRun: cfg.dryRun === true, clockSynced, clockOffset };
    }

    /* ── RUN NOW (Immediate Execution) ── */

    case 'RUN_NOW': {
      const cfg = await loadConfig();
      if (!cfg) return { ok: false, error: 'No config saved. Open Settings to configure.' };

      const tab = await getIRCTCTab(cfg.bookingSite);
      if (!tab) return { ok: false, error: 'No IRCTC tab found. Open irctc.co.in first.' };
      activeTabId = tab.id;

      armed = true;
      targetTime = Date.now();

      try {
        await chrome.tabs.sendMessage(activeTabId, {
          type: 'RUN_NOW',
          config: cfg,
          targetTime,
          isLive: cfg.dryRun !== true,
        });
      } catch (e) {
        armed = false;
        return { ok: false, error: 'Content script not responding. Refresh the IRCTC tab.' };
      }

      log('RUN_NOW dispatched to active IRCTC tab.');
      return { ok: true, targetTime };
    }

    /* ── STOP / ABORT ── */

    case 'STOP': {
      armed = false;
      await chrome.storage.local.set({ _armed: false });
      const tab = await getIRCTCTab();
      if (tab) {
        try { await chrome.tabs.sendMessage(tab.id, { type: 'STOP' }); } catch (_) {}
      }
      log('STOP signal broadcasted.');
      return { ok: true };
    }

    /* ── State Query ── */

    case 'GET_STATE': {
      const cfg = await loadConfig();
      return {
        armed,
        targetTime,
        clockOffset,
        clockSynced,
        config: cfg,
        dryRun: cfg?.dryRun === true,
      };
    }

    /* ── Forward Direct Actions to Active IRCTC Tab ── */

    case 'FORWARD_ACTION': {
      const cfg = await loadConfig();
      const tab = await getIRCTCTab(cfg?.bookingSite);
      if (!tab) return { success: false, error: 'No active IRCTC tab found. Please open irctc.co.in.' };
      try {
        const response = await chrome.tabs.sendMessage(tab.id, msg.payload);
        return response || { success: true };
      } catch (e) {
        return { success: false, error: 'IRCTC page not responding. Please refresh the page.' };
      }
    }

    /* ── Telemetry Updates from Content Script ── */

    case 'STAGE_UPDATE': {
      broadcastToPopup(msg);
      return { ok: true };
    }

    case 'CHAIN_COMPLETE': {
      armed = false;
      await chrome.storage.local.set({ _armed: false });
      log('Chain complete:', msg.success ? 'SUCCESS' : 'FINISHED');
      broadcastToPopup(msg);
      return { ok: true };
    }

    case 'SCHEDULE_ALARM': {
      const cfg = await loadConfig();
      const res = await scheduleTatkalAlarm(cfg);
      return { ok: true, ...res };
    }

    default:
      return { ok: false, error: `Unknown message type: ${msg.type}` };
  }
}

/* ── Chrome Alarms Scheduler ────────────────────────────────────────── */

function getNextTatkalTime(isAc = false) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  let year = get('year');
  let month = get('month');
  let day = get('day');
  const nowSeconds = get('hour') * 3600 + get('minute') * 60 + get('second');

  // Pre-warm alarm fires 60 seconds before Tatkal quota opening (09:59 AM for AC, 10:59 AM for Non-AC)
  const targetHour = isAc ? 9 : 10;
  const targetMinute = 59;
  const targetSeconds = targetHour * 3600 + targetMinute * 60;

  if (nowSeconds >= targetSeconds) {
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth() + 1;
    day = nextDay.getUTCDate();
  }

  const pad = (n) => String(n).padStart(2, '0');
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(targetHour)}:${pad(targetMinute)}:00+05:30`).getTime();
}

async function scheduleTatkalAlarm(config) {
  if (!chrome.alarms) return null;
  const isAc = AC_CLASSES.has(config?.journeyClass);
  const alarmName = isAc ? 'tatkal-prewarm-ac' : 'tatkal-prewarm-non-ac';
  await chrome.alarms.clear('tatkal-prewarm-ac');
  await chrome.alarms.clear('tatkal-prewarm-non-ac');

  const when = getNextTatkalTime(isAc);
  await chrome.alarms.create(alarmName, { when });
  log(`Pre-warm alarm scheduled: ${alarmName} at ${new Date(when).toLocaleString()}`);
  return { alarmName, when };
}

if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name && alarm.name.startsWith('tatkal-prewarm')) {
      const cfg = await loadConfig();
      const site = cfg?.bookingSite === 'nget' ? 'nget' : 'eticket';
      const targetUrl = `https://www.irctc.co.in/${site}/train-search`;
      log(`Tatkal pre-warm alarm fired! Preparing IRCTC tab on ${site}…`, alarm.name);
      let tab = await getIRCTCTab(site);
      if (!tab) {
        await chrome.tabs.create({ url: targetUrl, active: true });
      } else {
        await chrome.tabs.update(tab.id, { active: true });
      }
    }
  });
}

function broadcastToPopup(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

async function loadConfig() {
  const data = await chrome.storage.local.get(['config', 'tatkal_config']);
  const cfg = data.config || data.tatkal_config || null;
  if (cfg && cfg.bookOnlyIfCnf === undefined) {
    cfg.bookOnlyIfCnf = true;
  }
  return cfg;
}

chrome.runtime.onInstalled.addListener(async () => {
  // Enable side panel to open on action click
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  const existing = await chrome.storage.local.get('config');
  if (!existing.config) {
    await chrome.storage.local.set({
      config: {
        journeyClass: 'SL',
        fromStation: '',
        toStation: '',
        bookOnlyIfCnf: true,
        dryRun: false
      },
      _armed: false,
    });
    log('Tatkal Arm initialized in LIVE mode.');
  }
});

// Configure Side Panel behavior on startup as well
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// Fallback action click handler to open side panel
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
    }
  });
}
