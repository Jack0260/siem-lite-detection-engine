import type { GeoLocation } from '@/types';

// Bundled offline IP-to-geo mapping using first-octet and known CIDR ranges.
// This is a simplified mapping for demonstration — production would use MaxMind GeoIP2.

interface GeoEntry {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
}

// Known IP ranges for common source locations
const ipRanges: { cidr: string; prefix: number; mask: number; geo: GeoEntry }[] = [
  { cidr: '203.0.113.0/24', prefix: 0xCB007100, mask: 0xFFFFFF00, geo: { country: 'Russia', countryCode: 'RU', region: 'Moscow', city: 'Moscow', lat: 55.7558, lon: 37.6173 } },
  { cidr: '198.51.100.0/24', prefix: 0xC6336400, mask: 0xFFFFFF00, geo: { country: 'China', countryCode: 'CN', region: 'Beijing', city: 'Beijing', lat: 39.9042, lon: 116.4074 } },
  { cidr: '192.0.2.0/24', prefix: 0xC0000200, mask: 0xFFFFFF00, geo: { country: 'United States', countryCode: 'US', region: 'California', city: 'San Francisco', lat: 37.7749, lon: -122.4194 } },
  { cidr: '10.0.0.0/8', prefix: 0x0A000000, mask: 0xFF000000, geo: { country: 'Private Network', countryCode: 'LO', region: 'Internal', city: 'Local', lat: 0, lon: 0 } },
  { cidr: '172.16.0.0/12', prefix: 0xAC100000, mask: 0xFFF00000, geo: { country: 'Private Network', countryCode: 'LO', region: 'Internal', city: 'Local', lat: 0, lon: 0 } },
  { cidr: '192.168.0.0/16', prefix: 0xC0A80000, mask: 0xFFFF0000, geo: { country: 'Private Network', countryCode: 'LO', region: 'Internal', city: 'Local', lat: 0, lon: 0 } },
  { cidr: '45.155.0.0/16', prefix: 0x2D9B0000, mask: 0xFFFF0000, geo: { country: 'Netherlands', countryCode: 'NL', region: 'North Holland', city: 'Amsterdam', lat: 52.3676, lon: 4.9041 } },
  { cidr: '185.220.0.0/16', prefix: 0xB9DC0000, mask: 0xFFFF0000, geo: { country: 'Romania', countryCode: 'RO', region: 'Bucharest', city: 'Bucharest', lat: 44.4268, lon: 26.1025 } },
  { cidr: '91.219.0.0/16', prefix: 0x5BDB0000, mask: 0xFFFF0000, geo: { country: 'Ukraine', countryCode: 'UA', region: 'Kyiv', city: 'Kyiv', lat: 50.4501, lon: 30.5234 } },
  { cidr: '188.166.0.0/16', prefix: 0xBCA60000, mask: 0xFFFF0000, geo: { country: 'Germany', countryCode: 'DE', region: 'Hesse', city: 'Frankfurt', lat: 50.1109, lon: 8.6821 } },
  { cidr: '139.59.0.0/16', prefix: 0x8B3B0000, mask: 0xFFFF0000, geo: { country: 'Singapore', countryCode: 'SG', region: 'Singapore', city: 'Singapore', lat: 1.3521, lon: 103.8198 } },
  { cidr: '159.65.0.0/16', prefix: 0x9F410000, mask: 0xFFFF0000, geo: { country: 'India', countryCode: 'IN', region: 'Karnataka', city: 'Bangalore', lat: 12.9716, lon: 77.5946 } },
  { cidr: '51.158.0.0/16', prefix: 0x339E0000, mask: 0xFFFF0000, geo: { country: 'France', countryCode: 'FR', region: 'Île-de-France', city: 'Paris', lat: 48.8566, lon: 2.3522 } },
  { cidr: '23.94.0.0/16', prefix: 0x175E0000, mask: 0xFFFF0000, geo: { country: 'Canada', countryCode: 'CA', region: 'Ontario', city: 'Toronto', lat: 43.6532, lon: -79.3832 } },
  { cidr: '146.70.0.0/16', prefix: 0x92460000, mask: 0xFFFF0000, geo: { country: 'United Kingdom', countryCode: 'GB', region: 'England', city: 'London', lat: 51.5074, lon: -0.1278 } },
  { cidr: '41.218.0.0/16', prefix: 0x29DA0000, mask: 0xFFFF0000, geo: { country: 'Nigeria', countryCode: 'NG', region: 'Lagos', city: 'Lagos', lat: 6.5244, lon: 3.3792 } },
  { cidr: '200.150.0.0/16', prefix: 0xC8960000, mask: 0xFFFF0000, geo: { country: 'Brazil', countryCode: 'BR', region: 'São Paulo', city: 'São Paulo', lat: -23.5505, lon: -46.6333 } },
  { cidr: '180.250.0.0/16', prefix: 0xB4FA0000, mask: 0xFFFF0000, geo: { country: 'Indonesia', countryCode: 'ID', region: 'Jakarta', city: 'Jakarta', lat: -6.2088, lon: 106.8456 } },
  { cidr: '80.82.0.0/16', prefix: 0x50520000, mask: 0xFFFF0000, geo: { country: 'Iran', countryCode: 'IR', region: 'Tehran', city: 'Tehran', lat: 35.6892, lon: 51.3890 } },
  { cidr: '212.193.0.0/16', prefix: 0xD4C10000, mask: 0xFFFF0000, geo: { country: 'North Korea', countryCode: 'KP', region: 'Pyongyang', city: 'Pyongyang', lat: 39.0392, lon: 125.7625 } },
];

function ipToInt(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return 0;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function lookupGeo(ip: string): GeoLocation | null {
  if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1') return null;
  const ipInt = ipToInt(ip);
  if (ipInt === 0) return null;

  for (const range of ipRanges) {
    if ((ipInt & range.mask) >>> 0 === range.prefix) {
      return range.geo;
    }
  }

  // Fallback: derive a pseudo-location from first octet
  const firstOctet = parseInt(ip.split('.')[0], 10);
  const fallbackLocations: GeoEntry[] = [
    { country: 'United States', countryCode: 'US', region: 'New York', city: 'New York', lat: 40.7128, lon: -74.006 },
    { country: 'United States', countryCode: 'US', region: 'California', city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
    { country: 'Germany', countryCode: 'DE', region: 'Bavaria', city: 'Munich', lat: 48.1351, lon: 11.582 },
    { country: 'Japan', countryCode: 'JP', region: 'Tokyo', city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    { country: 'Australia', countryCode: 'AU', region: 'New South Wales', city: 'Sydney', lat: -33.8688, lon: 151.2093 },
    { country: 'Brazil', countryCode: 'BR', region: 'Rio de Janeiro', city: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
  ];
  const geo = fallbackLocations[firstOctet % fallbackLocations.length];
  return geo;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function enrichEventsWithGeo(events: { sourceIp: string; geo?: GeoLocation }[]): void {
  for (const event of events) {
    if (!event.geo) {
      const geo = lookupGeo(event.sourceIp);
      if (geo) event.geo = geo;
    }
  }
}
