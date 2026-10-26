// Tourist districts of Pattaya from coordinates. Dot Property gives the administrative subdistrict,
// and most of Pattaya is "Nong Prue" or "Na Kluea", which says little to a buyer. The bands below
// follow the coast from north to south; Sukhumvit Road separates the beach side from East Pattaya.
// The borders are approximate (about 200 m), so a building on a border can land in its neighbour.

// Sukhumvit Road as [latitude, longitude] points from north to south.
const SUKHUMVIT = [
  [12.990, 100.905], [12.950, 100.902], [12.920, 100.903], [12.890, 100.908],
  [12.860, 100.918], [12.820, 100.930], [12.760, 100.940], [12.700, 100.950],
];

function sukhumvitLongitude(lat) {
  if (lat >= SUKHUMVIT[0][0]) return SUKHUMVIT[0][1];
  for (let i = 1; i < SUKHUMVIT.length; i++) {
    const [lat1, lng1] = SUKHUMVIT[i - 1];
    const [lat2, lng2] = SUKHUMVIT[i];
    if (lat >= lat2) return lng1 + ((lat - lat1) / (lat2 - lat1)) * (lng2 - lng1);
  }
  return SUKHUMVIT[SUKHUMVIT.length - 1][1];
}

// From north to south: the district starts at this latitude and runs south to the next one.
// Pratumnak Hill reaches further north on the coast (west of Thappraya and Pratumnak roads) than
// South Pattaya's streets do inland.
const PRATUMNAK_COAST_LNG = 100.873;

export const PATTAYA_DISTRICTS = [
  'Naklua & Wongamat', 'North Pattaya', 'Central Pattaya', 'South Pattaya', 'Pratumnak',
  'Jomtien', 'Na Jomtien', 'Bang Saray', 'East Pattaya',
];

// Pattaya and its surroundings: from Bang Lamung in the north to Sattahip's border in the south.
const inPattaya = (lat, lng) => lat > 12.68 && lat < 13.03 && lng > 100.84 && lng < 101.05;

export function pattayaDistrict(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inPattaya(lat, lng)) return null;
  if (lng > sukhumvitLongitude(lat)) return 'East Pattaya';
  if (lat >= 12.952) return 'Naklua & Wongamat';
  if (lat >= 12.940) return 'North Pattaya';
  if (lat >= 12.928) return 'Central Pattaya';
  if (lat >= 12.905 && (lat < 12.918 || (lat < 12.926 && lng < PRATUMNAK_COAST_LNG))) return 'Pratumnak';
  if (lat >= 12.918) return 'South Pattaya';
  if (lat >= 12.862) return 'Jomtien';
  if (lat >= 12.780) return 'Na Jomtien';
  return 'Bang Saray';
}

const titleCase = (s) => String(s).toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

// The district a buyer would name: Pattaya's tourist districts by coordinates, elsewhere the
// subdistrict from the listing.
export function districtOf(listing) {
  const pattaya = pattayaDistrict(listing.latitude, listing.longitude);
  if (pattaya) return { district: pattaya, districtSource: 'coordinates' };
  if (listing.subdistrict) return { district: titleCase(listing.subdistrict), districtSource: 'listing' };
  return { district: null, districtSource: null };
}
