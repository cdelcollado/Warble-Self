import type { MemoryChannel } from './types';

export interface RepeaterBookRecord {
  "State ID": string;
  "Rptr ID": number;
  "Frequency": string;
  "Input Freq": string;
  "PL": string;
  "TSQ": string;
  "Nearest City": string;
  "Landmark": string;
  "Region": string;
  "State": string;
  "Country": string;
  "Lat": string;
  "Long": string;
  "Callsign": string;
  "Use": string;
  "Operational Status": string;
  "D-Star": string;
  "System Fusion": string;
}

// Haversine distance calculation in kilometres
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radi de la Terra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export interface RepeaterResult {
  callsign: string;
  city: string;
  frequency: number;
  inputFreq: number;
  pl: string;
  tsq: string;
  lat: number;
  lon: number;
  region: string;
  state: string;
  use: string;
  status: string;
  distance?: number;
}

export async function fetchRepeaterBookRaw(
  country: string,
  state: string,
  band: 'ALL' | 'VHF' | 'UHF' = 'ALL',
  userLat?: number,
  userLon?: number
): Promise<RepeaterResult[]> {
  const url = country === 'United States' || country === 'Canada' || country === 'Mexico'
    ? `/api/repeater/export.php?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`
    : `/api/repeater/exportROW.php?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Error connecting to the RepeaterBook server");

  const data = await response.json();
  if (!data.results || data.count === 0) return [];

  const results: RepeaterResult[] = data.results
    .filter((r: RepeaterBookRecord) => {
      if (r["Operational Status"] !== "On-air" || r["Use"] !== "OPEN") return false;
      if (band === 'ALL') return true;
      const freq = parseFloat(r["Frequency"]);
      if (band === 'VHF' && freq >= 136 && freq <= 174) return true;
      if (band === 'UHF' && freq >= 400 && freq <= 520) return true;
      return false;
    })
    .map((r: RepeaterBookRecord) => ({
      callsign: r["Callsign"] || '',
      city: r["Nearest City"] || '',
      frequency: parseFloat(r["Frequency"]),
      inputFreq: parseFloat(r["Input Freq"]),
      pl: r["PL"] || '',
      tsq: r["TSQ"] || '',
      lat: parseFloat(r["Lat"]) || 0,
      lon: parseFloat(r["Long"]) || 0,
      region: r["Region"] || '',
      state: r["State"] || '',
      use: r["Use"] || '',
      status: r["Operational Status"] || '',
      distance: (userLat !== undefined && userLon !== undefined && parseFloat(r["Lat"]) && parseFloat(r["Long"]))
        ? calculateDistance(userLat, userLon, parseFloat(r["Lat"]), parseFloat(r["Long"]))
        : undefined,
    }));

  if (userLat !== undefined && userLon !== undefined) {
    results.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
  }

  return results;
}

export function repeaterToChannel(r: RepeaterResult): MemoryChannel {
  let duplex: 'None' | '+' | '-' = 'None';
  let offset = "0.000000";
  if (r.inputFreq > 0 && r.inputFreq !== r.frequency) {
    if (r.inputFreq > r.frequency) {
      duplex = '+';
      offset = (r.inputFreq - r.frequency).toFixed(6);
    } else {
      duplex = '-';
      offset = (r.frequency - r.inputFreq).toFixed(6);
    }
  }

  let toneMode: 'None' | 'Tone' | 'TSQL' = 'None';
  let tone = "88.5";
  let toneSql = "88.5";
  if (r.pl && parseFloat(r.pl)) { toneMode = 'Tone'; tone = parseFloat(r.pl).toFixed(1); }
  if (r.tsq && parseFloat(r.tsq)) { toneMode = 'TSQL'; toneSql = parseFloat(r.tsq).toFixed(1); }

  return {
    index: 0,
    name: (r.callsign || r.city).substring(0, 7),
    frequency: r.frequency.toFixed(6),
    duplex, offset, toneMode, tone, toneSql,
    dtcsCode: "023", rxDtcsCode: "023", dtcsPolarity: "NN",
    mode: "FM", power: "High", skip: false,
    distance: r.distance,
  } as any;
}

export async function fetchRepeaterBook(
  country: string, 
  state: string, 
  band: 'ALL' | 'VHF' | 'UHF' = 'ALL',
  userLat?: number,
  userLon?: number
): Promise<MemoryChannel[]> {
  const url = country === 'United States' || country === 'Canada' || country === 'Mexico'
    ? `/api/repeater/export.php?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`
    : `/api/repeater/exportROW.php?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error connecting to the RepeaterBook server");

    const data = await response.json();
    if (!data.results || data.count === 0) {
      return [];
    }

    const channels: MemoryChannel[] = [];
    
    // Keep only repeaters that are "On-air" and "OPEN"
    const activeRepeaters = data.results.filter((r: RepeaterBookRecord) => {
       if (r["Operational Status"] !== "On-air" || r["Use"] !== "OPEN") return false;
       if (band === 'ALL') return true;
       
       const freq = parseFloat(r["Frequency"]);
       if (band === 'VHF' && freq >= 136 && freq <= 174) return true;
       if (band === 'UHF' && freq >= 400 && freq <= 520) return true;
       
       return false;
    });

    activeRepeaters.forEach((r: RepeaterBookRecord) => {
      // Determine frequency and offset
      const rxFreq = parseFloat(r["Frequency"]);
      const txFreq = parseFloat(r["Input Freq"]);
      let duplex: 'None' | '+' | '-' = 'None';
      let offset = "0.000000";

      if (txFreq > 0 && txFreq !== rxFreq) {
        if (txFreq > rxFreq) {
          duplex = '+';
          offset = (txFreq - rxFreq).toFixed(6);
        } else {
          duplex = '-';
          offset = (rxFreq - txFreq).toFixed(6);
        }
      }

      // Determine PL/TSQ tones
      let toneMode: 'None' | 'Tone' | 'TSQL' = 'None';
      let tone = "88.5";
      let toneSql = "88.5";

      if (r["PL"] && parseFloat(r["PL"])) {
        toneMode = 'Tone';
        tone = parseFloat(r["PL"]).toFixed(1);
      }
      if (r["TSQ"] && parseFloat(r["TSQ"])) {
        toneMode = 'TSQL';
        toneSql = parseFloat(r["TSQ"]).toFixed(1);
      }

      // Determine mode (FM, NFM)
      const mode: 'FM' | 'NFM' | 'AM' = "FM";
      // Could be improved by checking spacing; defaulting to FM for wide-band repeaters.

      channels.push({
        index: 0, // Will be assigned automatically by AG Grid
        name: r["Callsign"] ? r["Callsign"].substring(0, 7) : r["Nearest City"].substring(0, 7),
        frequency: rxFreq.toFixed(6),
        duplex: duplex,
        offset: offset,
        toneMode: toneMode,
        tone: tone,
        toneSql: toneSql,
        dtcsCode: "023",
        rxDtcsCode: "023",
        dtcsPolarity: "NN",
        mode: mode,
        power: "High",
        skip: false,
        distance: (userLat !== undefined && userLon !== undefined && parseFloat(r["Lat"]) && parseFloat(r["Long"])) 
            ? calculateDistance(userLat, userLon, parseFloat(r["Lat"]), parseFloat(r["Long"])) 
            : undefined
      } as any);
    });

    if (userLat !== undefined && userLon !== undefined) {
      channels.sort((a: any, b: any) => (a.distance || 999999) - (b.distance || 999999));
    }

    return channels;
  } catch (error) {
    console.error("Error fetching data from RepeaterBook:", error);
    throw error;
  }
}
