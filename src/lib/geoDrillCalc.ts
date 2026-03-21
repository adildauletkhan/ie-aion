/**
 * GEO & DRILL calculation logic for Upstream capacity.
 * Calculates capacity from reserves and drilling assumptions.
 */

export interface GeoDrillInputs {
  reserves2P: number;       // Reserves (2P) in thousand tons
  rpYears: number;          // R/P ratio (years) — read-only, calculated
  baseProduction: number;   // Base production (current)
  declineRate: number;      // Decline rate (%)
  plannedNewWells: number;  // Planned new wells
  avgInitialProd: number;   // Avg initial production per well
}

export const defaultGeoDrillInputs: GeoDrillInputs = {
  reserves2P: 150000,
  rpYears: 0,
  baseProduction: 10000,
  declineRate: 8,
  plannedNewWells: 25,
  avgInitialProd: 120,
};

/**
 * Calculates UP capacity from GEO & DRILL assumptions.
 * Formula: base * (1 - decline/100) + newWells * avgProd
 * R/P = reserves / calculated capacity
 */
export function calculateUpCapacity(inputs: GeoDrillInputs): { capacity: number; rpYears: number } {
  const declinedBase = inputs.baseProduction * (1 - inputs.declineRate / 100);
  const newProduction = inputs.plannedNewWells * inputs.avgInitialProd;
  const capacity = Math.round(declinedBase + newProduction);
  const rpYears = capacity > 0 ? Math.round((inputs.reserves2P / capacity) * 10) / 10 : 0;
  return { capacity, rpYears };
}
