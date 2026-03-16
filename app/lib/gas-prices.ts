/**
 * Gas price fetcher using the EIA (U.S. Energy Information Administration) API
 * Free API — register at https://www.eia.gov/opendata/ for a key
 * Provides weekly retail gasoline & diesel prices by region
 */

export interface GasPriceEntry {
  region: string;
  grade: string;
  price: number;
  weekOf: string; // ISO date string
}

// EIA series IDs for weekly retail gas prices (dollars per gallon)
const EIA_SERIES: Record<string, { region: string; grade: string }> = {
  // US national averages
  'EMM_EPMR_PTE_NUS_DPG': { region: 'US', grade: 'regular' },
  'EMM_EPMM_PTE_NUS_DPG': { region: 'US', grade: 'midgrade' },
  'EMM_EPMP_PTE_NUS_DPG': { region: 'US', grade: 'premium' },
  'EMD_EPD2D_PTE_NUS_DPG': { region: 'US', grade: 'diesel' },
  // East Coast (PADD 1)
  'EMM_EPMR_PTE_R10_DPG': { region: 'East Coast', grade: 'regular' },
  // Midwest (PADD 2)
  'EMM_EPMR_PTE_R20_DPG': { region: 'Midwest', grade: 'regular' },
  // Gulf Coast (PADD 3)
  'EMM_EPMR_PTE_R30_DPG': { region: 'Gulf Coast', grade: 'regular' },
  // Rocky Mountain (PADD 4)
  'EMM_EPMR_PTE_R40_DPG': { region: 'Rocky Mountain', grade: 'regular' },
  // West Coast (PADD 5)
  'EMM_EPMR_PTE_R50_DPG': { region: 'West Coast', grade: 'regular' },
};

export async function fetchGasPrices(): Promise<GasPriceEntry[]> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    throw new Error('EIA_API_KEY not set');
  }

  const results: GasPriceEntry[] = [];

  // Fetch gasoline prices (petroleum/pri/gasprice)
  try {
    const gasUrl = new URL('https://api.eia.gov/v2/petroleum/pri/gasprice/data/');
    gasUrl.searchParams.set('api_key', apiKey);
    gasUrl.searchParams.set('frequency', 'weekly');
    gasUrl.searchParams.set('data[]', 'value');
    gasUrl.searchParams.set('sort[0][column]', 'period');
    gasUrl.searchParams.set('sort[0][direction]', 'desc');
    gasUrl.searchParams.set('length', '50'); // latest batch of records

    const res = await fetch(gasUrl.toString());
    if (!res.ok) {
      console.error(`EIA gas API error: ${res.status} ${res.statusText}`);
    } else {
      const json = await res.json();
      const data = json?.response?.data;

      if (Array.isArray(data)) {
        for (const row of data) {
          const seriesInfo = EIA_SERIES[row['series-id'] || row.seriesId || ''];
          if (!seriesInfo) continue;

          const value = parseFloat(row.value);
          if (isNaN(value)) continue;

          results.push({
            region: seriesInfo.region,
            grade: seriesInfo.grade,
            price: value,
            weekOf: row.period, // e.g. "2026-03-09"
          });
        }
      }
    }
  } catch (err) {
    console.error('EIA gas fetch error:', err);
  }

  // Fetch diesel prices (petroleum/pri/dist)
  try {
    const dieselUrl = new URL('https://api.eia.gov/v2/petroleum/pri/dist/data/');
    dieselUrl.searchParams.set('api_key', apiKey);
    dieselUrl.searchParams.set('frequency', 'weekly');
    dieselUrl.searchParams.set('data[]', 'value');
    dieselUrl.searchParams.set('sort[0][column]', 'period');
    dieselUrl.searchParams.set('sort[0][direction]', 'desc');
    dieselUrl.searchParams.set('length', '10');

    const res = await fetch(dieselUrl.toString());
    if (!res.ok) {
      console.error(`EIA diesel API error: ${res.status} ${res.statusText}`);
    } else {
      const json = await res.json();
      const data = json?.response?.data;

      if (Array.isArray(data)) {
        for (const row of data) {
          const value = parseFloat(row.value);
          if (isNaN(value)) continue;

          // Only grab US national diesel for now
          const areaName = (row['area-name'] || row.areaName || '').toString();
          if (areaName === 'U.S.' || row.duoarea === 'NUS') {
            results.push({
              region: 'US',
              grade: 'diesel',
              price: value,
              weekOf: row.period,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('EIA diesel fetch error:', err);
  }

  return results;
}
