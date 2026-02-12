# Test Report: Facility Control Modal Isolation

**Date:** 2026-01-31
**Tester:** QA Agent
**Branch:** CC

## Test Scope

Verification of the facility control interface isolation feature:
- New `FacilityControlModal.tsx` component
- Counter Facility Controls removed from `UpgradeShopModal.tsx`
- Facility Control button added to `NightDashboard.tsx`
- `showFacilityControl` state and `TOGGLE_FACILITY_CONTROL` action in GameContext

## Test Environment

- Browser: Chrome (Playwright)
- URL: http://localhost:3000
- Test Framework: Playwright

## Test Cases & Results

| # | Test Case | Steps | Expected Result | Actual Result | Status |
|---|-----------|-------|-----------------|---------------|--------|
| 1 | Facility control button hidden when no counter facilities | Load game in NIGHT phase without upgrades, check for Facility button | Button should NOT be visible | Button not visible | PASS |
| 2 | Facility control button appears with counter facility purchased | Load game in NIGHT phase WITH Tea Set purchased, check for Facility button | Button should be visible | Button visible | PASS |
| 3 | Facility control button shows maintenance cost | Load game with Tea Set Lv1 purchased, check button badge | Badge shows "-$20/day" | Badge shows "-$20/day" | PASS |
| 4 | FacilityControlModal opens and shows facilities | Click Facility button, verify modal content | Modal shows FACILITY_CONTROL title, Tea Set entry, Daily Maintenance | All elements visible correctly | PASS |
| 5 | Can toggle facility on/off in FacilityControlModal | Open modal, click toggle button | Toggle changes from green (on) to gray (off), cost shows "Disabled - No cost" | Toggle works correctly | PASS |
| 6 | UpgradeShopModal no longer has facility toggle controls | Open Upgrade Shop after purchasing Tea Set | No "Counter Facility Controls" section, no interactive toggle buttons | Section removed, no toggle buttons | PASS |
| 7 | No console errors during facility control operations | Perform facility control operations, monitor console | No critical errors | No errors detected | PASS |

## Implementation Details Verified

### FacilityControlModal.tsx
- Renders modal with title "FACILITY_CONTROL"
- Shows "Daily Maintenance" summary header with total cost
- Lists counter upgrades with toggle buttons
- Shows active effects (Patience bonus, Anomaly detection)
- Toggle only works during NIGHT phase
- When disabled, shows "Disabled - No cost"

### NightDashboard.tsx
- Facility Control button only appears when `hasCounterFacilities` is true
- Button shows maintenance cost badge when facilities are active
- Button dispatches `TOGGLE_FACILITY_CONTROL` action

### UpgradeShopModal.tsx
- No longer contains interactive toggle controls for facilities
- Only shows ON/OFF status badges (non-interactive)
- Facility management is now separated to FacilityControlModal

### GameContext.tsx
- `showFacilityControl: false` added to initial state
- `TOGGLE_FACILITY_CONTROL` action implemented
- Save/Load properly handles the new state

## Test Coverage

- Tested scenarios: 7
- Passed: 7
- Failed: 0
- Blocked: 0

## Conclusion

**Status:** PASS

**Summary:** The facility control interface isolation feature has been successfully implemented and verified. All 7 test cases pass. The FacilityControlModal correctly displays purchased counter facilities, allows toggling them on/off during night phase, and the UpgradeShopModal no longer contains the toggle controls.

**Key Verifications:**
1. Conditional rendering of Facility button works correctly
2. Modal displays all expected content (maintenance cost, facility list, active effects)
3. Toggle functionality works and updates state correctly
4. Separation of concerns between UpgradeShopModal (purchasing) and FacilityControlModal (management) is complete

[TESTS_PASSED]
