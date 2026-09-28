# 🏥 MedGuard-BD - Automated Selenium Dashboard Testing Suite

**Comprehensive End-to-End UI & Dashboard Automated Verification Framework**

---

## 📌 1. Project & Testing Suite Overview

MedGuard-BD is a national healthcare, pharmaceutical tracking, and pharmacovigilance platform. The platform features 7 distinct role-based portals, each customized for a specific stakeholder in Bangladesh's healthcare ecosystem.

To ensure stability and verify that every portal dashboard authenticates properly, navigates seamlessly, and renders all backend API data, charts, metrics, and cards, an automated testing framework has been constructed inside the `selenium_tests/` directory using **Python** and **Selenium WebDriver**.

---

## 🌐 2. Covered Portals & Verification Scope (7/7 Role Dashboards)

| Portal Role | Target Route | Purpose & Tested Components | Test Account |
| :--- | :--- | :--- | :--- |
| **Citizen** | `/dashboard` | Citizen health records, drug verification, ADR reporting, and pharmacy locator | `citizen1` |
| **Doctor** | `/dashboard/doctor` | Clinical overview, patient consultations, e-prescriptions, and drug recall alerts | `doctor1` |
| **Pharmacy** | `/dashboard/pharmacy` | Pharmacy inventory management, batch verification, sales logging, and supplier tracking | `pharmacy1` |
| **Manufacturer** | `/dashboard/manufacturer` | Medicine batch generation, manufacturing tracking, barcode verification, and recalls | `manufacturer1` |
| **Distributor** | `/dashboard/distributor` | Supply chain warehouse management, shipment routes, optimization, and risk tracking | `distributor1` |
| **DGDA** | `/dashboard/dgda` | Directorate General of Drug Administration (DGDA) national command center & intel | `dgda1` |
| **Researcher** | `/dashboard/researcher` | Pharmacovigilance data, ADR research intelligence, and adverse reaction analytics | `researcher1` |

---

## 📁 3. Directory Structure

```
MedGuard-BD/
│
└── selenium_tests/
    ├── test_dashboards.py     # Main Selenium Python Test Runner Script (60s Extended Timeouts)
    ├── run_tests.bat          # Interactive Windows Batch Launcher for 1-Click Execution
    ├── README.md              # Detailed Documentation & Presentation Guide
    └── screenshots/           # High-resolution Proof Screenshots captured after full data render
        ├── citizen_dashboard.png
        ├── doctor_dashboard.png
        ├── pharmacy_dashboard.png
        ├── manufacturer_dashboard.png
        ├── distributor_dashboard.png
        ├── dgda_dashboard.png
        └── researcher_dashboard.png
```

---

## ⚙️ 4. Key Engineering & Test Architecture Features

1. **Extended Explicit Wait Timeouts (60 Seconds):**
   - Configured `WebDriverWait(driver, 60)` to handle network latency or slow initial backend cold-starts cleanly without intermittent timeouts.

2. **Full Async Data Load & Chart Rendering Wait:**
   - React components render loading skeletons initially while fetching backend data via REST APIs (`axios`).
   - The test script incorporates post-navigation render pauses to guarantee that all cards, statistics, graphs, tables, and metrics are 100% loaded before taking proof screenshots.

3. **Automatic Chrome Driver Lifecycle Management:**
   - Uses Selenium 4 Driver Service with Chrome Options (`--window-size=1600,1000`, `--no-sandbox`, `--disable-gpu`) for reliable cross-platform execution.

4. **Dual Execution Modes (Headless vs. Live Visible Browser):**
   - **Headless Mode:** Fast, background CI/CD friendly execution.
   - **Headed/Visible Mode:** Opens a live Google Chrome window so evaluators and teachers can watch the automated login, form filling, navigation, and dashboard interaction in real time.

5. **Evidence Screenshot Capture:**
   - Automatically saves crisp screenshot artifacts for each portal into `selenium_tests/screenshots/`. In case of any test failure, a diagnostic failure screenshot (`*_FAILED.png`) is captured immediately.

---

## 🚀 5. How to Run the Tests

### ⚠️ Pre-requisites (Ensure Both Servers Are Active):
1. **Backend Server (Django):** `http://127.0.0.1:8000`
   ```bash
   cd backend
   python manage.py runserver
   ```
2. **Frontend Server (Vite / React):** `http://localhost:5173`
   ```bash
   cd frontend
   npm run dev
   ```

---

### Option A: Interactive 1-Click Batch File (Windows GUI)
1. Open File Explorer and navigate to `selenium_tests/`.
2. Double-click `run_tests.bat`.
3. Choose execution mode:
   - Type `1` for **Headless Mode** (Fast background execution).
   - Type `2` for **Live Browser Demo** (Visible Chrome window for live evaluator presentation).

---

### Option B: Command Line Interface (CLI)

#### 1. Live Demonstration Mode (Recommended for Teacher Evaluation):
```bash
python selenium_tests/test_dashboards.py --visible
```
> **Behavior:** Opens Google Chrome visibly, populates input fields, submits credentials, waits for full API data render, and moves through all 7 portals sequentially.

#### 2. Background Headless Mode:
```bash
python selenium_tests/test_dashboards.py
```

---

## 📊 6. Sample Test Execution Report

```text
================================================================================
 MEDGUARD-BD AUTOMATED SELENIUM DASHBOARD TEST SUITE
 Target Base URL : http://localhost:5173
 Execution Mode  : Headless (Background)
 Wait Timeout    : 60 Seconds
 Timestamp       : 2026-09-28 21:18:23
================================================================================

[1/7] Testing Citizen Portal Dashboard...
    Description: Citizen Health & Drug Verification Portal Dashboard
    Credentials: Username='citizen1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\citizen_dashboard.png
    [PASS] RESULT: PASSED (14.24s) -> Navigated & Loaded: http://localhost:5173/dashboard
--------------------------------------------------------------------------------
[2/7] Testing Doctor Portal Dashboard...
    Description: Doctor Clinical & Prescription Control Dashboard
    Credentials: Username='doctor1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\doctor_dashboard.png
    [PASS] RESULT: PASSED (14.28s) -> Navigated & Loaded: http://localhost:5173/dashboard/doctor
--------------------------------------------------------------------------------
[3/7] Testing Pharmacy Portal Dashboard...
    Description: Pharmacy Inventory & Dispensing Dashboard
    Credentials: Username='pharmacy1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\pharmacy_dashboard.png
    [PASS] RESULT: PASSED (14.52s) -> Navigated & Loaded: http://localhost:5173/dashboard/pharmacy
--------------------------------------------------------------------------------
[4/7] Testing Manufacturer Portal Dashboard...
    Description: Medicine Manufacturer & Batch Tracking Dashboard
    Credentials: Username='manufacturer1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\manufacturer_dashboard.png
    [PASS] RESULT: PASSED (14.05s) -> Navigated & Loaded: http://localhost:5173/dashboard/manufacturer
--------------------------------------------------------------------------------
[5/7] Testing Distributor Portal Dashboard...
    Description: Supply Chain & Distribution Operations Dashboard
    Credentials: Username='distributor1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\distributor_dashboard.png
    [PASS] RESULT: PASSED (15.01s) -> Navigated & Loaded: http://localhost:5173/dashboard/distributor
--------------------------------------------------------------------------------
[6/7] Testing DGDA Portal Dashboard...
    Description: DGDA National Regulatory Command Center Dashboard
    Credentials: Username='dgda1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\dgda_dashboard.png
    [PASS] RESULT: PASSED (14.09s) -> Navigated & Loaded: http://localhost:5173/dashboard/dgda
--------------------------------------------------------------------------------
[7/7] Testing Researcher Portal Dashboard...
    Description: Pharmacovigilance & Research Intelligence Dashboard
    Credentials: Username='researcher1', Password='***'
    [WAIT] Waiting 6 seconds for dashboard API data and charts to fully render...
    [SHOT] Screenshot saved: D:\MedGuard-BD\selenium_tests\screenshots\researcher_dashboard.png
    [PASS] RESULT: PASSED (14.21s) -> Navigated & Loaded: http://localhost:5173/dashboard/researcher
--------------------------------------------------------------------------------

================================================================================
 SELENIUM DASHBOARD TEST SUMMARY REPORT
================================================================================
Role Dashboard       | Status     | Time (s)   | Verified URL
--------------------------------------------------------------------------------
Citizen              | [PASS]     | 16.39      | http://localhost:5173/dashboard
Doctor               | [PASS]     | 16.44      | http://localhost:5173/dashboard/doctor
Pharmacy             | [PASS]     | 16.66      | http://localhost:5173/dashboard/pharmacy
Manufacturer         | [PASS]     | 16.19      | http://localhost:5173/dashboard/manufacturer
Distributor          | [PASS]     | 17.18      | http://localhost:5173/dashboard/distributor
DGDA                 | [PASS]     | 16.26      | http://localhost:5173/dashboard/dgda
Researcher           | [PASS]     | 16.37      | http://localhost:5173/dashboard/researcher
================================================================================
 Total Tests Run : 7
 Total Passed    : 7
 Total Failed    : 0
 Execution Time  : 115.5 seconds
 Screenshots Dir : D:\MedGuard-BD\selenium_tests\screenshots
================================================================================
```

---

## 🛠️ 7. Troubleshooting & Common Issues

- **ConnectionRefusedError / ERR_CONNECTION_REFUSED:**
  - Verify that the Django backend server is running on `http://127.0.0.1:8000` and Vite frontend server is running on `http://localhost:5173`.
- **Chrome Version Mismatch:**
  - Ensure Google Chrome browser is installed on the system. Selenium 4 manages the appropriate driver automatically.
- **Credential Invalid Error:**
  - The script relies on predefined seed test accounts (`citizen1`, `doctor1`, `pharmacy1`, `manufacturer1`, `distributor1`, `dgda1`, `researcher1` with password `pass123`). If credentials are altered, run `python create_test_users.py` at the root directory to reset them.
