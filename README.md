<p align="center">
  <img src="icons/icon128.png" width="92" height="92" alt="Tatkal Arm Logo" />
  <h1 align="center">Tatkal Arm</h1>
  <p align="center"><b>Precision IRCTC Tatkal Ticket Booking Assistant for Chrome</b></p>
</p>

<p align="center">
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?style=for-the-badge&logo=googlechrome" alt="Manifest V3" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://www.irctc.co.in"><img src="https://img.shields.io/badge/Platform-IRCTC%20Next%20Gen%20eTicketing-orange?style=for-the-badge" alt="Platform" /></a>
  <a href="#-design-system"><img src="https://img.shields.io/badge/Design-Electric%20Lime%20System-yellow?style=for-the-badge" alt="Design" /></a>
</p>

---

**Tatkal Arm** is a high-precision, sub-second responsive Chrome Extension designed to eliminate latency, manual entry friction, and cognitive load during the critical 10:00 AM (AC) and 11:00 AM (Non-AC) Indian Railways (IRCTC) Tatkal ticket booking windows.

Engineered with Google Antigravity and Impeccable Design engineering standards, Tatkal Arm docks directly into the Chrome Side Panel alongside IRCTC, coordinating atomic clock synchronization, automated credential prefill, quota selection, passenger form auto-injection, and on-site payment automation (supporting **IRCTC eWallet**, **IRCTC iPay**, and external bank gateways).

---

## <img src="assets/icons/dashboard.svg" width="20" height="20" alt="Dashboard" /> Overview & Architecture

Tatkal Arm runs as an orchestrated pair:
1. **Docked Side Panel UI (`popup.html` / `popup.js`)**: An obsidian dark interface with Electric Lime accents, responsive grid cards, live atomic clock drift telemetry, and 1-click execution triggers.
2. **Background Service Worker (`background.js`)**: Maintains high-precision NTP/atomic clock sync via `timeapi.io` and handles arming timers down to $(T - 0.5s)$, plus pre-warm alarm wakeup.
3. **In-Page Automation Engine (`content.js` / `selectors.js`)**: Executes DOM interactions using synthetic Angular input dispatchers and event dispatchers, ensuring Angular reactive forms register values across both **Classic (`/nget`)** and **Beta/Modern (`/eticket`)** IRCTC portals.
4. **External Gateway Automator (`gateway.js`)**: Pre-fills card details and selects preferred instruments on IRCTC iPay and PhonePe gateways.
5. **Network Shield (`rules.json`)**: Employs DeclarativeNetRequest to silently block 43 heavy analytics and advertising networks, saving CPU cycles on the IRCTC booking thread.

---

## <img src="assets/icons/sparkles.svg" width="20" height="20" alt="Features" /> Key Features

### <img src="assets/icons/timer.svg" width="18" height="18" alt="Timer" /> Atomic Clock Sync & Target Precision Engine
- Queries Indian Standard Time (IST) servers with round-trip latency compensation to establish the true local clock drift.
- Automatically calculates opening target instants:
  - **AC Classes (1A, 2A, 3A, CC, EC)**: Target instant is `10:00:00 IST - 500ms`.
  - **Non-AC Classes (SL, 2S)**: Target instant is `11:00:00 IST - 500ms`.
  - **Tatkal Date**: Automatically defaults to tomorrow's travel date.

### <img src="assets/icons/sliders.svg" width="18" height="18" alt="Portal" /> Dual Portal Architecture (Beta eticket + Classic nget)
- **Beta Portal (`/eticket/`)**: Full automation for the modern next-gen IRCTC layout with `#newLogin`, `div.field-box`, `app-jp-input`, and `.ep-modal-panel`.
- **Classic Portal (`/nget/`)**: Full automation for the standard IRCTC layout with `p-autocomplete`, `p-calendar`, and PrimeNG data tables.
- **Dynamic Portal Switcher**: Configure your preferred portal version (Beta or Classic) in Settings; tab detection and pre-warm alarms automatically target your chosen portal.

### <img src="assets/icons/shield.svg" width="18" height="18" alt="Shield" /> Real-Time Interruption Defense & Modal Killer
- **Language Dialog Dismissal**: Auto-dismisses the intrusive "Welcome to IRCTC / Preferred Language" popup by selecting English instantly.
- **Home Tour Bypass**: Auto-skips the IRCTC Home Tour popup (`app-home-tour`) and suppresses backdrops.
- **Session Restore Dismissal**: Cleans up leftover session restore confirmation dialogs.
- **High-Load Error Auto-Retry**: Automatically closes IRCTC's "High load | Please retry" error banners and re-triggers availability enquiries without delay.
- **Akamai WAF Detection**: Detects Akamai blocks cleanly and notifies the user with diagnostic reference IDs.

### <img src="assets/icons/wallet.svg" width="18" height="18" alt="Wallet" /> 1-Tap Visual Payment Automation
- **IRCTC eWallet (Recommended for Tatkal)**: Automatically selects on-site IRCTC eWallet on the payment gateway, bypassing slow external bank redirects and 3D-Secure timeouts. Optionally auto-fills the transaction password/PIN.
- **IRCTC iPay**: Direct payment gateway selection with auto-tabbing for UPI or Cards.
- **BHIM / UPI**: Automatically selects BHIM/UPI and populates your configured Virtual Payment Address (VPA) with quick suffix chips (`@okaxis`, `@oksbi`, `@paytm`, `@ybl`).
- **NetBanking & Cards**: Pre-selects preferred banks (SBI, HDFC, ICICI, etc.) or card details.
- **External Gateway Auto-Fill**: Automatically fills Card Number, Expiry, CVV, and Cardholder Name on `irctcipay.com`, `pg.irctcpayments.com`, and `phonepe.com`.
- **Passenger Page Payment Mode**: Intelligently toggles UPI (₹20 + GST) vs Cards (₹30 + GST) on `/psgninput`.

### <img src="assets/icons/users.svg" width="18" height="18" alt="Users" /> High-Speed Passenger Injection & Master List Matching
- Supports up to 4 Tatkal passengers with name, age, gender, and berth preference (Lower, Middle, Upper, Side Lower, Side Upper, Window).
- **Dual Strategy**: Checks if passengers exist in your IRCTC Master List / Saved Passenger profile (`button.btn-existing` or inline rows), ticking checkboxes in one instant batch; if not present, dynamically triggers the `+ Add Passenger` button and dispatches native keyboard events to Angular form controls.
- **Confirm Berths Only (`bookOnlyIfCnf`)**: Enforces booking only if confirmed Tatkal berths are allocated (defaults to `true`), avoiding unwanted waitlists.
- **Co-Branded Card Loyalty Auto-Skip**: Automatically bypasses IRCTC loyalty benefit prompts to prevent hang-ups.

### <img src="assets/icons/shield.svg" width="18" height="18" alt="Network Shield" /> Network Ad & Tracker Shield
- Uses Chrome Manifest V3 `declarativeNetRequest` rules to eliminate heavy third-party tracking scripts, video banners, and ad networks (Google AdSense, DoubleClick, Taboola, Outbrain, Criteo, Automatad, etc.) on IRCTC domain.
- Prevents main-thread UI stutter when thousands of concurrent users overload IRCTC servers.

### <img src="assets/icons/flask.svg" width="18" height="18" alt="Simulator" /> Dry-Run Test Simulator
- Built-in test fuse simulates the complete booking sequence with an immediate 10-second countdown.
- Runs all selectors, form fills, and gateway selections, then safely halts before final payment submission for testing.

---

## <img src="assets/icons/lock.svg" width="20" height="20" alt="Security" /> Privacy & Security Architecture

- **No Remote Credentials**: All passwords, user IDs, and travel configurations are stored locally on your machine via `chrome.storage.local`.
- **Zero External Telemetry**: No user inputs, credentials, or personal travel data are ever transmitted to third-party servers.
- **Documentation & Access Integrity**: Follows Chrome Manifest V3 strict sandboxing guidelines. Sanctioned paths and standard user-facing inputs only.

---

## <img src="assets/icons/folder.svg" width="20" height="20" alt="Folder" /> Project Structure

```text
TatkalArm/
├── manifest.json        # Extension Manifest V3 configuration & permissions
├── background.js        # Service worker, atomic clock sync, alarms & message routing
├── content.js           # IRCTC page automation engine, modal killer & event dispatchers
├── selectors.js         # Resilient CSS/Angular DOM selectors across IRCTC stages
├── gateway.js           # External payment gateway automator (iPay & PhonePe)
├── cosmetic.css         # In-page banner cleanup & cosmetic overrides
├── rules.json           # DeclarativeNetRequest rules blocking 43 ad/tracker hosts
├── popup.html           # Side Panel dashboard & Settings UI
├── popup.css            # Dark Obsidian & Electric Lime UI styles
├── popup.js             # Side panel controller, live telemetry, and state sync
├── options.html         # Full-screen Impeccable Operate settings view
├── options.css          # Dedicated settings styling & typography
├── options.js           # Options controller & validation
├── assets/icons/        # Vector theme SVG icons for documentation
├── icons/               # High-res extension icons (16, 32, 48, 128px)
├── LICENSE              # MIT License
└── README.md            # Documentation & user guide
```

---

## <img src="assets/icons/download.svg" width="20" height="20" alt="Download" /> Installation Instructions

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Maadhu938/Tatkal-ticket-booking-helper.git
   ```
2. Open **Google Chrome** and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `TatkalArm` folder.
6. Click the extension icon in your toolbar to dock **Tatkal Arm** to the side panel alongside IRCTC.

---

## <img src="assets/icons/sliders.svg" width="20" height="20" alt="Settings" /> Configuration & Usage

1. Open the **Tatkal Arm** side panel.
2. Click the **Settings** button in the top navigation bar.
3. Enter your:
   - **IRCTC User ID & Password** (stored only in local browser memory).
   - **Origin & Destination Station Codes** (e.g. `NDLS` and `MMCT`).
   - **Class** (e.g. `SL` Sleeper or `3A` AC 3-Tier).
   - **Passenger details** (Name, Age, Gender, Berth).
   - **Preferred Payment Method** (e.g. `IRCTC eWallet`, `IRCTC iPay`, `BHIM / UPI`, or `Cards`).
   - **Confirm Berths Only** (defaulted to `true` to guarantee confirmed seats).
4. Click **Save Configuration**.
5. Log into [IRCTC](https://www.irctc.co.in/nget/train-search) and click **ARM FOR TATKAL (T−0.5s)** (or use **RUN ALL NOW** for immediate testing).

---

## <img src="./assets/icons/info.svg" width="20" height="20" alt="Disclaimer" align="absmiddle" /> Disclaimer

This project is an open-source tool developed for educational, accessibility, and personal booking assistance purposes. It automates legitimate user input within the browser environment. Users are advised to adhere to IRCTC's terms of service and ticketing guidelines.

---

## <img src="./assets/icons/scale.svg" width="20" height="20" alt="License" align="absmiddle" /> License

This project is licensed under the [MIT License](LICENSE).
