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
    let res = await fetch(`${BASE_URL}/alerts?status=active`);
    let json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(json.data));
    let activeAlert = json.data.find((a: any) => a.status === 'active');
    if (!activeAlert) {
      // Self-healing: create a verified test alert if all existing alerts are acknowledged
      const allAlertsRes = await fetch(`${BASE_URL}/alerts`);
      const allJson = await allAlertsRes.json();
      if (allJson.data && allJson.data.length > 0) {
        // Reopen first alert for test
        const target = allJson.data[0];
        await fetch(`${BASE_URL}/alerts/${target.id}/reopen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ reason: 'Reopened for automated verification test' })
        });
      }
      res = await fetch(`${BASE_URL}/alerts`);
      json = await res.json();
      activeAlert = json.data.find((a: any) => a.status === 'active' || a.status === 'recurring');
    }
    assert.ok(activeAlert, 'Should have at least 1 testable alert');
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
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': 'MITS_IOT_GATEWAY_KEY_2024'
      },
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
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': 'MITS_IOT_GATEWAY_KEY_2024'
      },
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

  // ▶ SUITE 6: PHASE 2 ADVANCED DEEP SECURITY HARDENING
  console.log('▶ SUITE 6: Advanced Deep Security Hardening Verification');

  await runTest('DeepSecurity', 'Registration rejects weak passwords violating modern policy', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Security User',
        email: `weak_${Date.now()}@mits.ac.in`,
        password: 'weak',
        confirmPassword: 'weak',
        role: 'viewer'
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 400, 'Weak password must be rejected with 400');
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('Password must be at least 8 characters') || json.message.includes('uppercase'));
  });

  await runTest('DeepSecurity', 'Token Revocation: Logging out invalidates JWT session on server blacklist', async () => {
    // 1. Login to get a dedicated temporary token
    const loginRes = await fetch(`${BASE_URL}/auth/verify-and-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ephemeral Session User',
        email: 'admin@mitsgwalior.in',
        role: 'super_admin',
        password: 'Admin@123'
      })
    });
    const loginJson = await loginRes.json();
    const ephemeralToken = loginJson.token;
    assert.ok(ephemeralToken, 'Expected ephemeral token');

    // 2. Verify token works initially
    const preCheck = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${ephemeralToken}` }
    });
    assert.strictEqual(preCheck.status, 200, 'Token should work prior to revocation');

    // 3. Explicitly logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ephemeralToken}` }
    });
    assert.strictEqual(logoutRes.status, 200);

    // 4. Token must now be rejected immediately with 401
    const postCheck = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${ephemeralToken}` }
    });
    assert.strictEqual(postCheck.status, 401, 'Revoked token must be rejected with 401 Unauthorized');
  });

  await runTest('DeepSecurity', 'IoT Security: Unauthenticated telemetry ingestion is rejected with 401', async () => {
    const unauthedRes = await fetch(`${BASE_URL}/pipeline/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'SPOOFED_IOT_SENSOR_01',
        powerKw: 99.5,
        energyKwh: 1200
      })
    });
    assert.strictEqual(unauthedRes.status, 401, 'Unauthenticated IoT ingest must return 401');

    // With authorized hardware device key, it succeeds
    const authedRes = await fetch(`${BASE_URL}/pipeline/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': 'MITS_IOT_GATEWAY_KEY_2024'
      },
      body: JSON.stringify({
        deviceId: 'ESP32_SECURE_GATEWAY_01',
        buildingId: 'MITS_MAIN_BUILDING',
        powerKw: 4.2,
        energyKwh: 340.5
      })
    });
    assert.strictEqual(authedRes.status, 201, 'Authorized device key must succeed with 201 Created');
  });

  await runTest('DeepSecurity', 'XSS Perimeter & Application Defense: Injected script tags are blocked by IDS with 403', async () => {
    // Perimeter IDS test: raw executable script tags are blocked
    const idsBlockedRes = await fetch(`${BASE_URL}/alerts/${testAlertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        resolutionNote: '<script>alert("XSS_ATTACK")</script>Replaced faulty fuse.'
      })
    });
    assert.strictEqual(idsBlockedRes.status, 403, 'Intrusion Detection System must block raw executable script tags with 403');

    // Application Layer test: legitimate resolution notes with brackets or formatting are sanitized and stored safely
    const legitRes = await fetch(`${BASE_URL}/alerts/${testAlertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        resolutionNote: 'Replaced faulty fuse [Phase A] and normalized telemetry balance.'
      })
    });
    const json = await legitRes.json();
    assert.strictEqual(legitRes.status, 200, 'Legitimate formatted resolution note must succeed');
    assert.ok(json.data.resolutionNote.includes('Replaced faulty fuse'));
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

  // ▶ SUITE 7: PHASE 3 ENTERPRISE SECURITY MONITORING & THREAT DEFENCE
  console.log('\n▶ SUITE 7: Enterprise Security Monitoring, IDS & Threat Defence');

  await runTest('EnterpriseIDS', 'Every HTTP response returns an enterprise X-Correlation-ID header', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(res.status, 200);
    const corrId = res.headers.get('x-correlation-id');
    assert.ok(corrId, 'Expected X-Correlation-ID header in response');
    assert.ok(corrId.length > 8);
  });

  await runTest('EnterpriseIDS', 'SQL Injection attempt in query string is intercepted and blocked with 403', async () => {
    const res = await fetch(`${BASE_URL}/buildings?filter=' OR '1'='1`);
    assert.strictEqual(res.status, 403, 'SQL Injection must be blocked with 403');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('Campus Intrusion Detection System') || json.message.includes('blocked'));
  });

  await runTest('EnterpriseIDS', 'XSS attack payload in request body is intercepted and blocked with 403', async () => {
    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '<script>alert(document.cookie)</script>' })
    });
    assert.strictEqual(res.status, 403, 'XSS payload must be blocked by IDS with 403');
  });

  await runTest('EnterpriseIDS', 'Path Traversal attempt is intercepted and blocked with 403', async () => {
    const res = await fetch(`${BASE_URL}/uploads?file=../../etc/passwd`);
    assert.strictEqual(res.status, 403, 'Path traversal must be blocked with 403');
  });

  await runTest('IoTThreats', 'IoT Telemetry Flooding triggers rate limit and device quarantine', async () => {
    const floodDeviceId = `ESP32_FLOOD_${Date.now()}`;
    let hitRateLimit = false;

    // Send 18 rapid packets
    for (let i = 0; i < 18; i++) {
      const res = await fetch(`${BASE_URL}/pipeline/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-key': 'MITS_IOT_GATEWAY_KEY_2024'
        },
        body: JSON.stringify({
          deviceId: floodDeviceId,
          powerKw: 5.0,
          energyKwh: 100 + i
        })
      });
      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert.strictEqual(hitRateLimit, true, 'Telemetry flooding must trigger 429 rate limit');

    // Immediate next call must be quarantined (403)
    const quarantinedRes = await fetch(`${BASE_URL}/pipeline/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': 'MITS_IOT_GATEWAY_KEY_2024'
      },
      body: JSON.stringify({
        deviceId: floodDeviceId,
        powerKw: 5.0,
        energyKwh: 200
      })
    });
    assert.strictEqual(quarantinedRes.status, 403, 'Quarantined device must be rejected with 403');

    // Super Admin can restore device
    const restoreRes = await fetch(`${BASE_URL}/security/restore-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ deviceId: floodDeviceId })
    });
    assert.strictEqual(restoreRes.status, 200, 'Super admin can restore quarantined device');
  });

  await runTest('SIEM', 'Super Admin can access structured security logs while Viewer is denied', async () => {
    const resViewer = await fetch(`${BASE_URL}/security/events`, {
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    assert.strictEqual(resViewer.status, 403, 'Viewer must be denied access to SIEM logs');

    const resAdmin = await fetch(`${BASE_URL}/security/events`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdmin.status, 200, 'Super admin can retrieve SIEM logs');
    const jsonAdmin = await resAdmin.json();
    assert.strictEqual(jsonAdmin.success, true);
    assert.ok(Array.isArray(jsonAdmin.data));
    assert.ok(jsonAdmin.data.length > 0, 'Security logs should contain recorded events');
    assert.ok(jsonAdmin.data[0].correlationId, 'Log event must contain correlation ID');
  });

  await runTest('SIEM', 'GET /security/stats returns active incident statistics and quarantined metrics', async () => {
    const res = await fetch(`${BASE_URL}/security/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(typeof json.data.totalEvents === 'number');
    assert.ok(typeof json.data.criticalEvents === 'number');
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
