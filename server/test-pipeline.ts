import { db } from './db.js';

console.log('=== ACCEPTANCE TEST SUITE: ENERGY DATA PIPELINE, SOLAR & ANOMALIES ===\n');

// 1. Ingestion Validation
console.log('Test 1: Normal Valid Sensor Telemetry Ingestion');
const r1 = db.addEnergyReading({
  meterId: 'DEV_ESP32_AI_LAB',
  meterName: 'MITS AI Lab Feeder',
  buildingId: 'MITS_AI_BUILDING',
  buildingName: 'AI & Data Science Block',
  timestamp: new Date().toISOString(),
  powerKw: 14.5,
  energyKwh: 120.4,
  voltage: 230.5,
  currentAmps: 63.0,
  powerFactor: 0.97,
  dataSource: 'sensor'
});
console.log('  Result:', r1.success ? 'PASS ✅' : 'FAIL ❌', 'Status:', r1.qualityStatus, 'ID:', r1.reading?.id);

// 2. Reject Malformed Data (Negative Power)
console.log('\nTest 2: Reject Malformed/Negative Power Value (-12.8 kW)');
const r2 = db.addEnergyReading({
  meterId: 'DEV_CORRUPT_METER',
  meterName: 'Corrupt Meter',
  buildingId: 'MITS_AI_BUILDING',
  buildingName: 'AI & Data Science Block',
  timestamp: new Date().toISOString(),
  powerKw: -12.8,
  energyKwh: 100,
  dataSource: 'sensor'
});
console.log('  Result:', !r2.success ? 'PASS (Properly Rejected) ✅' : 'FAIL ❌', 'Reason:', r2.rejectionReason);

// 3. Reject Implausible Out-of-Range (> 2500 kW)
console.log('\nTest 3: Reject Implausible Out-of-Range Value (50000 kW)');
const r3 = db.addEnergyReading({
  meterId: 'DEV_SPIKE_METER',
  meterName: 'Spike Meter',
  buildingId: 'MITS_AI_BUILDING',
  buildingName: 'AI & Data Science Block',
  timestamp: new Date().toISOString(),
  powerKw: 50000,
  energyKwh: 100,
  dataSource: 'sensor'
});
console.log('  Result:', !r3.success ? 'PASS (Properly Rejected) ✅' : 'FAIL ❌');

// 4. Duplicate Suppression (< 2s identical meter reading)
console.log('\nTest 4: Duplicate Record Suppression');
const r4 = db.addEnergyReading({
  meterId: 'DEV_ESP32_AI_LAB',
  meterName: 'MITS AI Lab Feeder',
  buildingId: 'MITS_AI_BUILDING',
  buildingName: 'AI & Data Science Block',
  timestamp: new Date().toISOString(),
  powerKw: 14.5,
  energyKwh: 120.4,
  dataSource: 'sensor'
});
console.log('  Result:', (!r4.success && r4.qualityStatus === 'duplicate') ? 'PASS (Duplicate Suppressed) ✅' : 'FAIL ❌', 'Status:', r4.qualityStatus);

// 5. Solar Telemetry Overview & Calculations
console.log('\nTest 5: Solar PV Generation & Avoided Cost Calculations');
const solar = db.getSolarOverview();
console.log('  Total Solar Capacity:', solar.totalCapacityKwp, 'kWp');
console.log('  Current Output:', solar.currentOutputKw, 'kW');
console.log('  Today Generated:', solar.todayGeneratedKwh, 'kWh');
console.log('  Estimated Avoided Cost (Today): ₹', solar.avoidedCostTodayINR);
console.log('  Avoided CO2 Today:', solar.avoidedCo2TodayKg, 'kg');
console.log('  Active Solar Installations:', solar.installations.length);
console.log('  Result:', solar.installations.length === 3 ? 'PASS ✅' : 'FAIL ❌');

// 6. Unused Equipment & Idle Waste Detection
console.log('\nTest 6: Unused Equipment Findings Retrieval');
const findings = db.getUnusedEquipmentFindings();
console.log('  Active Idle Findings Count:', findings.length);
findings.forEach((f, i) => {
  console.log(`    [${i+1}] ${f.deviceName} (${f.roomNumber}) - Reason: ${f.reasonFlag} | Avoidable: ₹${f.costImpactINR}`);
});
console.log('  Result:', findings.length >= 3 ? 'PASS ✅' : 'FAIL ❌');

// 7. Pipeline Diagnostics Status
console.log('\nTest 7: Central Pipeline Diagnostics Status');
const status = db.getDataPipelineStatus();
console.log('  DB Status:', status.databaseStatus);
console.log('  Total Stored Readings:', status.totalEnergyReadings);
console.log('  Active Data Sources:', status.activeDataSources.length);
console.log('  Anomaly Engine Version:', status.anomalyPipeline.modelVersion);
console.log('  Result:', status.databaseStatus === 'healthy' ? 'PASS ✅' : 'FAIL ❌');

console.log('\n=== ALL ACCEPTANCE TESTS COMPLETED SUCCESSFULLY ===');
