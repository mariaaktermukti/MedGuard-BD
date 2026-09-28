"""
MedGuard-BD - Automated Selenium Dashboard Testing Suite
Author: MedGuard-BD Team
Description: End-to-end UI testing for all 7 role-based portal dashboards using Selenium WebDriver.
Handles authentication, URL routing verification, async data rendering wait, and full screenshot capture.
"""

import os
import sys
import time
import argparse
from datetime import datetime
# pyrefly: ignore [missing-import]
from selenium import webdriver
# pyrefly: ignore [missing-import]
from selenium.webdriver.common.by import By
# pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait
# pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC
# pyrefly: ignore [missing-import]
from selenium.webdriver.chrome.options import Options

# Configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
TIMEOUT_SECONDS = 60  # 1 Minute Wait Timeout

# Role-based test cases for all 7 dashboards
PORTAL_TEST_CASES = [
    {
        "role": "Citizen",
        "username": "citizen1",
        "password": "pass123",
        "expected_path": "/dashboard",
        "description": "Citizen Health & Drug Verification Portal Dashboard"
    },
    {
        "role": "Doctor",
        "username": "doctor1",
        "password": "pass123",
        "expected_path": "/dashboard/doctor",
        "description": "Doctor Clinical & Prescription Control Dashboard"
    },
    {
        "role": "Pharmacy",
        "username": "pharmacy1",
        "password": "pass123",
        "expected_path": "/dashboard/pharmacy",
        "description": "Pharmacy Inventory & Dispensing Dashboard"
    },
    {
        "role": "Manufacturer",
        "username": "manufacturer1",
        "password": "pass123",
        "expected_path": "/dashboard/manufacturer",
        "description": "Medicine Manufacturer & Batch Tracking Dashboard"
    },
    {
        "role": "Distributor",
        "username": "distributor1",
        "password": "pass123",
        "expected_path": "/dashboard/distributor",
        "description": "Supply Chain & Distribution Operations Dashboard"
    },
    {
        "role": "DGDA",
        "username": "dgda1",
        "password": "pass123",
        "expected_path": "/dashboard/dgda",
        "description": "DGDA National Regulatory Command Center Dashboard"
    },
    {
        "role": "Researcher",
        "username": "researcher1",
        "password": "pass123",
        "expected_path": "/dashboard/researcher",
        "description": "Pharmacovigilance & Research Intelligence Dashboard"
    },
]

def create_driver(headless=False):
    """Initializes and returns a clean Selenium Chrome WebDriver instance."""
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1200")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--log-level=3")
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def run_dashboard_tests(headless=False, capture_screenshots=True):
    """Executes automated tests across all 7 role dashboards and saves full proof screenshots."""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    print("=" * 80)
    print(" MEDGUARD-BD AUTOMATED SELENIUM DASHBOARD TEST SUITE")
    print(f" Target Base URL : {BASE_URL}")
    print(f" Execution Mode  : {'Headless (Background)' if headless else 'Headed (Visible Browser)'}")
    print(f" Wait Timeout    : {TIMEOUT_SECONDS} Seconds")
    print(f" Timestamp       : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()

    results = []
    start_total_time = time.time()

    for idx, test in enumerate(PORTAL_TEST_CASES, 1):
        role = test["role"]
        username = test["username"]
        password = test["password"]
        expected_path = test["expected_path"]
        desc = test["description"]
        
        print(f"[{idx}/{len(PORTAL_TEST_CASES)}] Testing {role} Portal Dashboard...")
        print(f"    Description: {desc}")
        print(f"    Credentials: Username='{username}', Password='***'")
        
        start_time = time.time()
        driver = None
        status = "FAILED"
        error_msg = None
        final_url = ""

        try:
            driver = create_driver(headless=headless)
            
            # Step 1: Open Login Page
            driver.get(f"{BASE_URL}/login")
            
            # Step 2: Input Login Credentials
            username_field = WebDriverWait(driver, TIMEOUT_SECONDS).until(
                EC.presence_of_element_located((By.NAME, "username"))
            )
            password_field = driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(username)
            password_field.clear()
            password_field.send_keys(password)
            
            # Step 3: Click Submit Button
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
            
            # Step 4: Wait for URL redirection to target path (up to 60s)
            WebDriverWait(driver, TIMEOUT_SECONDS).until(EC.url_contains(expected_path))
            final_url = driver.current_url
            
            # Step 5: Wait for root container or main element
            WebDriverWait(driver, TIMEOUT_SECONDS).until(
                EC.presence_of_element_located((By.TAG_NAME, "main"))
            )
            
            # Step 6: Wait 6 seconds for async REST API calls, statistics cards, and charts to fully render
            print(f"    [WAIT] Waiting 6s for dashboard API data and charts to fully render...")
            time.sleep(6)
            
            # Step 7: Capture screenshot
            if capture_screenshots:
                screenshot_filename = f"{role.lower()}_dashboard.png"
                screenshot_filepath = os.path.join(SCREENSHOT_DIR, screenshot_filename)
                
                # Expand window height to match total scroll height if needed
                total_height = driver.execute_script("return document.body.scrollHeight")
                if total_height > 1200:
                    driver.set_window_size(1600, min(total_height + 100, 2400))
                    time.sleep(0.5)
                    
                driver.save_screenshot(screenshot_filepath)
                print(f"    [SHOT] Screenshot saved: {screenshot_filepath}")
            
            status = "PASSED"
            elapsed = round(time.time() - start_time, 2)
            print(f"    [PASS] RESULT: PASSED ({elapsed}s) -> Navigated & Loaded: {final_url}")

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            error_msg = str(e).splitlines()[0] if str(e) else "Timeout or navigation error"
            if driver:
                final_url = driver.current_url
                err_screenshot = os.path.join(SCREENSHOT_DIR, f"{role.lower()}_FAILED.png")
                try:
                    driver.save_screenshot(err_screenshot)
                    print(f"    [SHOT] Failure screenshot saved: {err_screenshot}")
                except Exception:
                    pass
            print(f"    [FAIL] RESULT: FAILED ({elapsed}s) -> Current URL: {final_url} | Error: {error_msg}")

        finally:
            if driver:
                driver.quit()

        results.append({
            "role": role,
            "status": status,
            "url": final_url,
            "elapsed": round(time.time() - start_time, 2),
            "error": error_msg
        })
        print("-" * 80)

    total_duration = round(time.time() - start_total_time, 2)
    passed_count = sum(1 for r in results if r["status"] == "PASSED")
    failed_count = len(results) - passed_count

    # Print Summary Table
    print("\n" + "=" * 80)
    print(" SELENIUM DASHBOARD TEST SUMMARY REPORT")
    print("=" * 80)
    print(f"{'Role Dashboard':<20} | {'Status':<10} | {'Time (s)':<10} | {'Verified URL'}")
    print("-" * 80)
    for r in results:
        status_str = "[PASS]" if r["status"] == "PASSED" else "[FAIL]"
        print(f"{r['role']:<20} | {status_str:<10} | {r['elapsed']:<10} | {r['url']}")
    print("=" * 80)
    print(f" Total Tests Run : {len(results)}")
    print(f" Total Passed    : {passed_count}")
    print(f" Total Failed    : {failed_count}")
    print(f" Execution Time  : {total_duration} seconds")
    print(f" Screenshots Dir : {SCREENSHOT_DIR}")
    print("=" * 80)

    return failed_count == 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MedGuard-BD Selenium Dashboard Test Runner")
    parser.add_argument("--visible", action="store_true", help="Run browser in visible (headed) mode for live demonstration")
    parser.add_argument("--no-screenshots", action="store_true", help="Disable taking screenshot proof")
    args = parser.parse_args()

    success = run_dashboard_tests(
        headless=not args.visible,
        capture_screenshots=not args.no_screenshots
    )
    sys.exit(0 if success else 1)
