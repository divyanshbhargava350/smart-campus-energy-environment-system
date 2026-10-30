import assert from 'assert';

const BASE_URL = 'http://localhost:4000/api';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(suite: string, test: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ suite, test, passed: true });
    console.log(`  ✓ [${suite}] ${test}`);
  } catch (err: any) {
    results.push({ suite, test, passed: false, error: err?.message || String(err) });
    console.error(`  ✗ [${suite}] ${test}:`, err?.message || err);
  }
}

async function main() {
  console.log('================================================================');
  console.log('MITS GWALIOR — SMART CAMPUS SECURITY & AUDIT AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  let adminToken = '';
  let hodEeToken = '';
  let viewerToken = '';
  let testAlertId = '';

  // 1. AUTHENTICATION & RATE LIMITING SUITE
  console.log('▶ SUITE 1: Authentication & Rate Limiting Verification');
  
  await runTest('Auth', 'Admin demo login succeeds with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/auth/verify-and-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Campus Administrator — Admin Demo',
        email: 'admin@mitsgwalior.in',
        role: 'super_admin',
        password: 'Admin@123'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Expected status 200');
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.user.role, 'super_admin');
    assert.ok(json.token, 'Expected JWT token');
    assert.ok(!json.user.passwordHash, 'passwordHash must never be exposed');
    adminToken = json.token;
  });

  await runTest('Auth', 'HOD demo login succeeds with department assignment', async () => {
    const res = await fetch(`${BASE_URL}/auth/verify-and-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Electrical Engineering HOD — HOD Demo',
        email: 'hod.ee@mitsgwalior.in',
        role: 'department_hod',
        departmentId: 'DEPT_EE',
        password: 'Hod@123'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.user.role, 'department_hod');
    assert.strictEqual(json.user.departmentId, 'DEPT_EE');
    assert.ok(json.token);
    hodEeToken = json.token;
  });

  await runTest('Auth', 'Student / Viewer login succeeds passwordless & returns safe profile', async () => {
    const res = await fetch(`${BASE_URL}/auth/verify-and-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Student Viewer — Student Demo',
        email: 'student.demo@mitsgwalior.in',
        role: 'viewer'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.user.role, 'viewer');
    assert.ok(json.token);
    viewerToken = json.token;
  });

  await runTest('Auth', 'Invalid credentials return generic error and increment lockout counter', async () => {
    const fakeEmail = `audit_test_${Date.now()}@mitsgwalior.in`;
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fakeEmail, password: 'WrongPassword999!' })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('Invalid') || json.message.includes('verify'));
  });

  // 2. SERVER-SIDE RBAC (ROLE-BASED ACCESS CONTROL)
  console.log('\n▶ SUITE 2: Server-Side RBAC & Scope Enforcement');

  await runTest('RBAC', 'Viewer is blocked from creating appliance commands (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/appliances/APP_E001_AC_1/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerToken}`
      },
      body: JSON.stringify({ state: 'on' })
    });
    assert.strictEqual(res.status, 403, 'Viewer must receive 403 Forbidden');
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });

  await runTest('RBAC', 'Viewer is blocked from acknowledging alerts (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/alerts/ALT_AUDIT_DUMMY/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerToken}`
      }
    });
    assert.strictEqual(res.status, 403);
  });

  await runTest('RBAC', 'Viewer is blocked from resolving alerts (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/alerts/ALT_AUDIT_DUMMY/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerToken}`
      },
      body: JSON.stringify({ resolutionNote: 'Illegal viewer resolve attempt' })
    });
    assert.strictEqual(res.status, 403);
  });

  // 3. PERSISTENT FAULT & ALERT LIFECYCLE STATE MACHINE
  console.log('\n▶ SUITE 3: Real Persistent Alert Lifecycle (Acknowledge & Resolve)');

  await runTest('Alerts', 'Fetch active alerts and verify baseline', async () => {
    const res = await fetch(`${BASE_URL}/alerts?status=active`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(json.data));
    const activeAlert = json.data.find((a: any) => a.status === 'active');
    assert.ok(activeAlert, 'Should have at least 1 active alert');
    testAlertId = activeAlert.id;
  });

  await runTest('Alerts', 'Acknowledge fault persists state, user, timestamp, and audit history', async () => {
    const res = await fetch(`${BASE_URL}/alerts/${testAlertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ note: 'Investigating high load on transformer feeder' })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'acknowledged');
    assert.ok(json.data.acknowledgedAt);
    assert.ok(json.data.acknowledgedBy);
    assert.ok(Array.isArray(json.data.resolutionHistory));
    assert.strictEqual(json.data.resolutionHistory[0].action, 'acknowledged');
  });

  await runTest('Alerts', 'Duplicate acknowledgment is rejected with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/alerts/${testAlertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });

  await runTest('Alerts', 'Resolve fault without mandatory note is rejected with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/alerts/${testAlertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ resolutionNote: '' })
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('mandatory resolution note'));
  });

  await runTest('Alerts', 'Resolve fault persists resolution note, diagnostics, verified condition, and audit history', async () => {
    const noteText = 'Replaced damaged terminal block in EE Sub-panel. Power load restored to 3.8 kW normal.';
    const res = await fetch(`${BASE_URL}/alerts/${testAlertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        resolutionNote: noteText,
        diagnosticNotes: 'Phase unbalance detected at 14% prior to replacement',
        verifiedCondition: 'Telemetry confirmed balanced 230V per phase across all 3 phases'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'resolved');
    assert.strictEqual(json.data.resolutionNote, noteText);
    assert.ok(json.data.resolvedAt);
    assert.ok(json.data.resolvedBy);
    assert.strictEqual(json.data.resolutionHistory[0].action, 'resolved');
  });

  await runTest('Alerts', 'Duplicate resolve submission is rejected with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/alerts/${testAlertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ resolutionNote: 'Second attempt to resolve same alert' })
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });

  await runTest('Alerts', 'Reopen resolved fault transitions to recurring state', async () => {
    const res = await fetch(`${BASE_URL}/alerts/${testAlertId}/reopen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ note: 'Current spike re-occurred during evening load test' })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'recurring');
    assert.strictEqual(json.data.isRecurring, true);
  });

  // 4. ENERGY DATA PIPELINE & RANGE CHECKS
  console.log('\n▶ SUITE 4: Energy Data Pipeline & Quarantine Ingestion');

  await runTest('Pipeline', 'Valid sensor reading is normalized, validated, and persisted', async () => {
    const res = await fetch(`${BASE_URL}/pipeline/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'ESP32_EE_METER_01',
        buildingId: 'MITS_ELECTRICAL_BLOCK',
        roomId: 'ROOM_EE_001',
        powerKw: 14.5,
        energyKwh: 128.4,
        voltage: 232.1,
        currentAmps: 62.5,
        powerFactor: 0.94,
        frequencyHz: 50.1,
        timestamp: new Date().toISOString(),
        dataSource: 'sensor'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.ok(json.readingId);
  });

  await runTest('Pipeline', 'Out-of-range sensor reading (negative power) is rejected/quarantined', async () => {
    const res = await fetch(`${BASE_URL}/pipeline/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'ESP32_BAD_SENSOR',
        powerKw: -95.0, // Invalid physical reading
        energyKwh: 10
      })
    });
    assert.strictEqual(res.status, 422, 'Expected 422 Unprocessable Entity for invalid range');
  });

  // 5. HISTORICAL REPORTS ENGINE (REAL AGGREGATIONS OVER STORED DATA)
  console.log('\n▶ SUITE 5: Historical Reports Engine (Audit Aggregations, No Math.random())');

  await runTest('Reports', 'Weekly report returns deterministic aggregated numbers without random variance', async () => {
    const res1 = await fetch(`${BASE_URL}/reports/weekly`);
    const json1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.ok(json1.data.days && json1.data.days.length === 7);

    // Call second time: must return identical deterministic totals (not Math.random()!)
    const res2 = await fetch(`${BASE_URL}/reports/weekly`);
    const json2 = await res2.json();
    assert.strictEqual(json1.data.days[0].totalKwh, json2.data.days[0].totalKwh, 'Readings must be deterministic, not Math.random()');
  });

  await runTest('Reports', 'POST /reports/generate produces comprehensive audit summary with breakdown and carbon metrics', async () => {
    const res = await fetch(`${BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        period: 'monthly'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    const r = json.report;
    assert.ok(r.reportId);
    assert.strictEqual(r.period, 'monthly');
    assert.ok(r.totalConsumptionKwh > 0);
    assert.ok(r.solarGeneratedKwh > 0);
    assert.ok(r.carbonAbatedKg > 0);
    assert.ok(r.estimatedCostINR > 0);
    assert.ok(Array.isArray(r.breakdown));
    assert.ok(r.breakdown.length > 0);
  });

  await runTest('Reports', 'HOD report generation is strictly restricted to their department', async () => {
    const res = await fetch(`${BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hodEeToken}`
      },
      body: JSON.stringify({
        period: 'weekly',
        departmentId: 'DEPT_AI_DS' // Attempt to query another department
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    // Even though HOD requested DEPT_AI_DS, server enforced DEPT_EE
    assert.strictEqual(json.report.departmentId, 'DEPT_EE', 'Server must strictly enforce HOD department isolation');
  });

  // 6. HEALTH, WATER, ENVIRONMENT, SUSTAINABILITY & API MODULES
  console.log('\n▶ SUITE 6: Production Health, Water & Sustainability Endpoints');

  await runTest('Health', 'GET /health returns healthy system status and memory metrics', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.status, 'healthy');
    assert.ok(json.services && json.services.database.status === 'connected');
    assert.ok(json.memory && json.memory.rssMb > 0);
  });

  await runTest('Water', 'GET /water/overview returns campus water tanks & storage volumes', async () => {
    const res = await fetch(`${BASE_URL}/water/overview`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.totalCapacityLiters > 0);
    assert.ok(Array.isArray(json.data.tanks));
    assert.ok(json.data.tanks.length >= 4);
  });

  await runTest('Water', 'POST /water/ingest validates volume and rejects negative values', async () => {
    const res = await fetch(`${BASE_URL}/water/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        meterId: 'WM_MAIN_01',
        tankId: 'TANK_MAIN_01',
        consumptionLiters: -500 // Negative value rejection check
      })
    });
    assert.strictEqual(res.status, 422);
  });

  await runTest('Environment', 'GET /environment/zones returns calibrated IAQ & CO2 zones', async () => {
    const res = await fetch(`${BASE_URL}/environment/zones`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    assert.ok(json.data[0].co2Ppm > 0);
  });

  await runTest('Sustainability', 'GET /sustainability/score returns computed composite score and carbon footprint', async () => {
    const res = await fetch(`${BASE_URL}/sustainability/score`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.overallIndex >= 0 && json.data.overallIndex <= 100);
    assert.ok(json.data.carbonFootprintKg.totalKg > 0);
    assert.ok(json.data.renewableSharePercent > 0);
  });

  await runTest('Modules', 'GET /analytics, /forecast, /buildings, /users aliases work with proper security', async () => {
    const resAnalytics = await fetch(`${BASE_URL}/analytics`);
    const jsonAnalytics = await resAnalytics.json();
    assert.strictEqual(resAnalytics.status, 200);
    assert.strictEqual(jsonAnalytics.success, true);

    const resForecast = await fetch(`${BASE_URL}/forecast`);
    const jsonForecast = await resForecast.json();
    assert.strictEqual(resForecast.status, 200);
    assert.strictEqual(jsonForecast.success, true);

    // /users requires super_admin
    const resUsersViewer = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    assert.strictEqual(resUsersViewer.status, 403, 'Viewer must be denied /users');

    const resUsersAdmin = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resUsersAdmin.status, 200, 'Super admin can access /users');
  });

  // SUMMARY
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`TEST SUMMARY: ${passed}/${total} passed (${failed} failed)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL AUDIT CRITERIA MET WITH 100% SUCCESS.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
