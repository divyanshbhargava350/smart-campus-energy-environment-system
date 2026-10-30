import { db } from './db.js';
import { SolarGridEnergyBalance } from '../shared/types.js';

export class MITSEnergyEngine {
  // Real-time micro fluctuation helper
  public getLiveFactor(): number {
    return 1 + (Math.sin(Date.now() / 3500) * 0.015) + ((Math.random() - 0.5) * 0.008);
  }

  // Get Solar vs Grid Energy Balance for MITS Gwalior
  public getEnergyBalance(): SolarGridEnergyBalance {
    const data = db.getData();
    const factor = this.getLiveFactor();

    // 1. Calculate Total Campus Load (Sum of all building loads except solar)
    let totalCampusDemandKw = 0;
    let totalCampusTodayKwh = 0;

    data.buildings.forEach(b => {
      if (b.id !== 'MITS_SOLAR_PLANT') {
        totalCampusDemandKw += b.currentPowerKw * factor;
        totalCampusTodayKwh += b.todayEnergyKwh;
      }
    });

    // 2. Solar Generation (MITS 350 kWp Rooftop Solar)
    const solarPlant = data.buildings.find(b => b.id === 'MITS_SOLAR_PLANT');
    const solarGeneratedKw = (solarPlant?.currentPowerKw || 215) * factor;
    const solarGeneratedTodayKwh = solarPlant?.todayEnergyKwh || 1420;

    // 3. Solar Used on Campus vs Solar Exported to Grid
    // If solar generation is less than total campus load, 100% of solar is used on campus
    // If solar generation exceeds campus load (e.g. on holidays or peak midday), excess is exported
    let solarUsedCampusKw = 0;
    let solarExportedGridKw = 0;
    let gridElectricityUsedKw = 0;

    if (solarGeneratedKw <= totalCampusDemandKw) {
      solarUsedCampusKw = solarGeneratedKw;
      solarExportedGridKw = 0;
      gridElectricityUsedKw = totalCampusDemandKw - solarUsedCampusKw;
    } else {
      solarUsedCampusKw = totalCampusDemandKw;
      solarExportedGridKw = solarGeneratedKw - totalCampusDemandKw;
      gridElectricityUsedKw = 0;
    }

    // Daily cumulative totals
    const solarUsedTodayKwh = Math.min(solarGeneratedTodayKwh, totalCampusTodayKwh * 0.42);
    const solarExportedTodayKwh = Math.max(0, solarGeneratedTodayKwh - solarUsedTodayKwh);
    const gridElectricityTodayKwh = Math.max(0, totalCampusTodayKwh - solarUsedTodayKwh);
    const solarOffsetPercentage = +((solarUsedCampusKw / (totalCampusDemandKw || 1)) * 100).toFixed(1);

    return {
      solarGeneratedKw: +solarGeneratedKw.toFixed(1),
      solarGeneratedTodayKwh: Math.round(solarGeneratedTodayKwh),
      solarUsedCampusKw: +solarUsedCampusKw.toFixed(1),
      solarUsedTodayKwh: Math.round(solarUsedTodayKwh),
      solarExportedGridKw: +solarExportedGridKw.toFixed(1),
      solarExportedTodayKwh: Math.round(solarExportedTodayKwh),
      gridElectricityUsedKw: +gridElectricityUsedKw.toFixed(1),
      gridElectricityTodayKwh: Math.round(gridElectricityTodayKwh),
      totalCampusDemandKw: +totalCampusDemandKw.toFixed(1),
      totalCampusTodayKwh: Math.round(totalCampusTodayKwh),
      solarOffsetPercentage
    };
  }

  // 24-hour diurnal profile for MITS Gwalior (Solar generation curve vs Campus demand curve)
  public get24HourCurve(entityId = 'CAMPUS') {
    const hourly = [];
    for (let h = 0; h < 24; h++) {
      let campusLoadKw = 0;
      let solarGenKw = 0;

      // Realistic college daily load pattern:
      if (h >= 0 && h < 6) {
        campusLoadKw = 140 + Math.sin(h) * 10; // Night baseline (Hostels + server racks + streetlights)
      } else if (h >= 6 && h < 9) {
        campusLoadKw = 190 + (h - 6) * 45; // Morning college arrival
      } else if (h >= 9 && h < 16) {
        campusLoadKw = 380 + Math.sin(h * 0.8) * 35; // Peak academic & lab hours
      } else if (h >= 16 && h < 18) {
        campusLoadKw = 410 + Math.cos(h) * 20; // 4 PM spike as solar drops
      } else if (h >= 18 && h < 22) {
        campusLoadKw = 260 + Math.sin(h) * 15; // Evening hostel & library
      } else {
        campusLoadKw = 180 - (h - 22) * 20;
      }

      // Solar generation curve (07:00 to 17:30, peaks at 12:30 at ~285 kW)
      if (h >= 7 && h <= 17) {
        const progress = (h - 7) / 10;
        solarGenKw = Math.sin(progress * Math.PI) * 285;
      }

      const solarUsedKw = Math.min(solarGenKw, campusLoadKw);
      const gridUsedKw = Math.max(0, campusLoadKw - solarUsedKw);
      const solarExportKw = Math.max(0, solarGenKw - campusLoadKw);

      hourly.push({
        hour: h,
        timeLabel: `${String(h).padStart(2, '0')}:00`,
        campusLoadKw: +campusLoadKw.toFixed(1),
        solarGenKw: +solarGenKw.toFixed(1),
        solarUsedKw: +solarUsedKw.toFixed(1),
        gridUsedKw: +gridUsedKw.toFixed(1),
        solarExportKw: +solarExportKw.toFixed(1),
        isSolarActive: solarGenKw > 5
      });
    }
    return hourly;
  }
}

export const energyEngine = new MITSEnergyEngine();
