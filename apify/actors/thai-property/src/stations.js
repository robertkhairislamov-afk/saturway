// Nearest BTS/MRT station for projects whose listing page does not name one. Each station's
// position is estimated from the projects the site places close to it (within NEAR_KM), and a
// project without an answer gets the nearest such station, marked "estimated". The estimate is
// about as good as the site's own distances (a few hundred metres), so it stops at MAX_KM.

import { distanceM } from './projects.js';

const NEAR_KM = 0.4;
const MAX_KM = 2;

// The middle of a project's listings: one stray pin does not move it.
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

export function projectPositions(listings) {
  const points = new Map();
  for (const l of listings) {
    if (!l.projectKey || !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude)) continue;
    if (!points.has(l.projectKey)) points.set(l.projectKey, { lat: [], lng: [] });
    points.get(l.projectKey).lat.push(l.latitude);
    points.get(l.projectKey).lng.push(l.longitude);
  }
  return new Map([...points].map(([key, { lat, lng }]) => [key, { lat: median(lat), lng: median(lng) }]));
}

// A copy of the project details with the station filled in where the page gave none. Details
// with a station from the page get nearestStationSource "page"; the stored details are not changed.
export function withEstimatedStations(details, listings) {
  const positions = projectPositions(listings);
  const near = new Map();
  for (const [key, info] of Object.entries(details)) {
    const at = positions.get(key);
    if (!info?.nearestStation || !at || !(info.nearestStationKm <= NEAR_KM)) continue;
    if (!near.has(info.nearestStation)) near.set(info.nearestStation, { line: info.nearestStationLine, points: [] });
    near.get(info.nearestStation).points.push(at);
  }
  const stations = [...near].map(([name, { line, points }]) => ({
    name,
    line,
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  }));
  const out = {};
  let estimated = 0;
  for (const [key, info] of Object.entries(details)) {
    if (info?.nearestStation) {
      out[key] = { ...info, nearestStationSource: 'page' };
      continue;
    }
    const at = positions.get(key);
    let best = null;
    for (const station of at ? stations : []) {
      const km = distanceM(at, station) / 1000;
      if (km <= MAX_KM && (!best || km < best.km)) best = { station, km };
    }
    if (!best) {
      out[key] = info;
      continue;
    }
    estimated++;
    out[key] = { ...info, nearestStation: best.station.name, nearestStationLine: best.station.line, nearestStationKm: Math.round(best.km * 10) / 10, nearestStationSource: 'estimated' };
  }
  return { details: out, stations: stations.length, estimated };
}
