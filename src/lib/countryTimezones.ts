// ============================================================================
// COMPREHENSIVE COUNTRY → IANA TIMEZONE MAPPING
// ============================================================================

/**
 * Maps country names to their IANA timezone(s).
 * Countries with a single timezone have a string value.
 * Countries with multiple timezones have an array value.
 */
export const COUNTRY_TIMEZONES: Record<string, string | string[]> = {
  // Single-timezone countries
  "Afghanistan": "Asia/Kabul",
  "Albania": "Europe/Tirane",
  "Algeria": "Africa/Algiers",
  "Andorra": "Europe/Andorra",
  "Angola": "Africa/Luanda",
  "Argentina": "America/Argentina/Buenos_Aires",
  "Armenia": "Asia/Yerevan",
  "Austria": "Europe/Vienna",
  "Azerbaijan": "Asia/Baku",
  "Bahrain": "Asia/Bahrain",
  "Bangladesh": "Asia/Dhaka",
  "Belarus": "Europe/Minsk",
  "Belgium": "Europe/Brussels",
  "Bhutan": "Asia/Thimphu",
  "Bolivia": "America/La_Paz",
  "Bosnia and Herzegovina": "Europe/Sarajevo",
  "Botswana": "Africa/Gaborone",
  "Bulgaria": "Europe/Sofia",
  "Cambodia": "Asia/Phnom_Penh",
  "Cameroon": "Africa/Douala",
  "Chile": "America/Santiago",
  "China": "Asia/Shanghai",
  "Colombia": "America/Bogota",
  "Costa Rica": "America/Costa_Rica",
  "Croatia": "Europe/Zagreb",
  "Cuba": "America/Havana",
  "Cyprus": "Asia/Nicosia",
  "Czech Republic": "Europe/Prague",
  "Czechia": "Europe/Prague",
  "Denmark": "Europe/Copenhagen",
  "Dominican Republic": "America/Santo_Domingo",
  "Ecuador": "America/Guayaquil",
  "Egypt": "Africa/Cairo",
  "El Salvador": "America/El_Salvador",
  "Estonia": "Europe/Tallinn",
  "Ethiopia": "Africa/Addis_Ababa",
  "Finland": "Europe/Helsinki",
  "France": "Europe/Paris",
  "Georgia": "Asia/Tbilisi",
  "Germany": "Europe/Berlin",
  "Ghana": "Africa/Accra",
  "Greece": "Europe/Athens",
  "Guatemala": "America/Guatemala",
  "Honduras": "America/Tegucigalpa",
  "Hong Kong": "Asia/Hong_Kong",
  "Hungary": "Europe/Budapest",
  "Iceland": "Atlantic/Reykjavik",
  "India": "Asia/Kolkata",
  "Bharat": "Asia/Kolkata",
  "Iraq": "Asia/Baghdad",
  "Ireland": "Europe/Dublin",
  "Israel": "Asia/Jerusalem",
  "Italy": "Europe/Rome",
  "Jamaica": "America/Jamaica",
  "Japan": "Asia/Tokyo",
  "Jordan": "Asia/Amman",
  "Kenya": "Africa/Nairobi",
  "Kuwait": "Asia/Kuwait",
  "Laos": "Asia/Vientiane",
  "Latvia": "Europe/Riga",
  "Lebanon": "Asia/Beirut",
  "Libya": "Africa/Tripoli",
  "Lithuania": "Europe/Vilnius",
  "Luxembourg": "Europe/Luxembourg",
  "Macau": "Asia/Macau",
  "Malaysia": "Asia/Kuala_Lumpur",
  "Maldives": "Indian/Maldives",
  "Malta": "Europe/Malta",
  "Mauritius": "Indian/Mauritius",
  "Morocco": "Africa/Casablanca",
  "Myanmar": "Asia/Yangon",
  "Nepal": "Asia/Kathmandu",
  "Netherlands": "Europe/Amsterdam",
  "New Zealand": "Pacific/Auckland",
  "Nicaragua": "America/Managua",
  "Nigeria": "Africa/Lagos",
  "North Korea": "Asia/Pyongyang",
  "North Macedonia": "Europe/Skopje",
  "Norway": "Europe/Oslo",
  "Oman": "Asia/Muscat",
  "Pakistan": "Asia/Karachi",
  "Palestine": "Asia/Gaza",
  "Panama": "America/Panama",
  "Paraguay": "America/Asuncion",
  "Peru": "America/Lima",
  "Philippines": "Asia/Manila",
  "Poland": "Europe/Warsaw",
  "Qatar": "Asia/Qatar",
  "Romania": "Europe/Bucharest",
  "Rwanda": "Africa/Kigali",
  "Saudi Arabia": "Asia/Riyadh",
  "Senegal": "Africa/Dakar",
  "Serbia": "Europe/Belgrade",
  "Singapore": "Asia/Singapore",
  "Slovakia": "Europe/Bratislava",
  "Slovenia": "Europe/Ljubljana",
  "South Africa": "Africa/Johannesburg",
  "South Korea": "Asia/Seoul",
  "Korea": "Asia/Seoul",
  "Spain": "Europe/Madrid",
  "Sri Lanka": "Asia/Colombo",
  "Sudan": "Africa/Khartoum",
  "Sweden": "Europe/Stockholm",
  "Switzerland": "Europe/Zurich",
  "Syria": "Asia/Damascus",
  "Taiwan": "Asia/Taipei",
  "Tanzania": "Africa/Dar_es_Salaam",
  "Thailand": "Asia/Bangkok",
  "Tunisia": "Africa/Tunis",
  "Turkey": "Europe/Istanbul",
  "Türkiye": "Europe/Istanbul",
  "Uganda": "Africa/Kampala",
  "Ukraine": "Europe/Kyiv",
  "United Arab Emirates": "Asia/Dubai",
  "UAE": "Asia/Dubai",
  "United Kingdom": "Europe/London",
  "UK": "Europe/London",
  "Uruguay": "America/Montevideo",
  "Uzbekistan": "Asia/Tashkent",
  "Venezuela": "America/Caracas",
  "Vietnam": "Asia/Ho_Chi_Minh",
  "Viet Nam": "Asia/Ho_Chi_Minh",
  "Yemen": "Asia/Aden",
  "Zambia": "Africa/Lusaka",
  "Zimbabwe": "Africa/Harare",
  "Iran": "Asia/Tehran",
  "Scotland": "Europe/London",
  "Wales": "Europe/London",
  "England": "Europe/London",
  "Portugal": "Europe/Lisbon",

  // Multi-timezone countries
  "United States": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  "USA": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  "Canada": [
    "America/Toronto",
    "America/Winnipeg",
    "America/Edmonton",
    "America/Vancouver",
    "America/Halifax",
    "America/St_Johns",
  ],
  "Australia": [
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Australia/Adelaide",
    "Australia/Darwin",
    "Australia/Hobart",
  ],
  "Russia": [
    "Europe/Moscow",
    "Europe/Samara",
    "Asia/Yekaterinburg",
    "Asia/Novosibirsk",
    "Asia/Krasnoyarsk",
    "Asia/Irkutsk",
    "Asia/Vladivostok",
    "Asia/Kamchatka",
  ],
  "Brazil": [
    "America/Sao_Paulo",
    "America/Manaus",
    "America/Belem",
    "America/Fortaleza",
    "America/Cuiaba",
    "America/Rio_Branco",
  ],
  "Indonesia": [
    "Asia/Jakarta",
    "Asia/Makassar",
    "Asia/Jayapura",
  ],
  "Mexico": [
    "America/Mexico_City",
    "America/Cancun",
    "America/Chihuahua",
    "America/Tijuana",
  ],
  "Mongolia": [
    "Asia/Ulaanbaatar",
    "Asia/Hovd",
  ],
  "Congo": [
    "Africa/Kinshasa",
    "Africa/Lubumbashi",
  ],
  "Kazakhstan": [
    "Asia/Almaty",
    "Asia/Aqtau",
  ],
};

/**
 * Friendly display labels for IANA timezone identifiers
 */
export const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time (ET)",
  "America/Chicago": "Central Time (CT)",
  "America/Denver": "Mountain Time (MT)",
  "America/Los_Angeles": "Pacific Time (PT)",
  "America/Phoenix": "Arizona (MST, no DST)",
  "America/Anchorage": "Alaska Time (AKT)",
  "Pacific/Honolulu": "Hawaii Time (HST)",
  "America/Toronto": "Eastern Time (ET)",
  "America/Winnipeg": "Central Time (CT)",
  "America/Edmonton": "Mountain Time (MT)",
  "America/Vancouver": "Pacific Time (PT)",
  "America/Halifax": "Atlantic Time (AT)",
  "America/St_Johns": "Newfoundland Time (NT)",
  "Australia/Sydney": "Sydney (AEST)",
  "Australia/Melbourne": "Melbourne (AEST)",
  "Australia/Brisbane": "Brisbane (AEST, no DST)",
  "Australia/Perth": "Perth (AWST)",
  "Australia/Adelaide": "Adelaide (ACST)",
  "Australia/Darwin": "Darwin (ACST, no DST)",
  "Australia/Hobart": "Hobart (AEST)",
  "Europe/Moscow": "Moscow (MSK)",
  "Asia/Yekaterinburg": "Yekaterinburg (YEKT)",
  "Asia/Novosibirsk": "Novosibirsk (NOVT)",
  "Asia/Vladivostok": "Vladivostok (VLAT)",
  "America/Sao_Paulo": "Brasília (BRT)",
  "America/Manaus": "Manaus (AMT)",
  "Asia/Jakarta": "Western Indonesia (WIB)",
  "Asia/Makassar": "Central Indonesia (WITA)",
  "Asia/Jayapura": "Eastern Indonesia (WIT)",
  "America/Mexico_City": "Central Mexico",
  "America/Cancun": "Eastern Mexico (EST)",
  "America/Tijuana": "Pacific Mexico (PT)",
  "Asia/Kolkata": "India (IST)",
  "Asia/Dubai": "Gulf (GST)",
  "Europe/London": "UK (GMT/BST)",
  "Europe/Paris": "Central Europe (CET)",
  "Europe/Berlin": "Central Europe (CET)",
  "Asia/Tokyo": "Japan (JST)",
  "Asia/Shanghai": "China (CST)",
  "Asia/Singapore": "Singapore (SGT)",
  "Asia/Seoul": "Korea (KST)",
  "Asia/Dhaka": "Bangladesh (BST)",
  "Asia/Karachi": "Pakistan (PKT)",
};

/**
 * Get the friendly label for a timezone, or format the IANA name if no label exists.
 */
export function getTimezoneDisplayLabel(tz: string): string {
  if (TIMEZONE_LABELS[tz]) return TIMEZONE_LABELS[tz];
  // Format "America/New_York" → "New York"
  const city = tz.split("/").pop()?.replace(/_/g, " ") || tz;
  return city;
}

/**
 * Check if a country has multiple timezones.
 */
export function isMultiTimezoneCountry(country: string): boolean {
  const tzs = getTimezonesForCountry(country);
  return tzs.length > 1;
}

/**
 * Get all valid IANA timezones for a given country name.
 */
export function getTimezonesForCountry(country: string): string[] {
  if (!country) return [];
  
  // Try exact match first
  const direct = COUNTRY_TIMEZONES[country];
  if (direct) return Array.isArray(direct) ? direct : [direct];
  
  // Try case-insensitive match
  const lower = country.toLowerCase().trim();
  for (const [key, val] of Object.entries(COUNTRY_TIMEZONES)) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(val) ? val : [val];
    }
  }
  
  return [];
}

/**
 * Resolve the best timezone for a country, using browser timezone for multi-tz countries.
 * Returns { timezone, needsUserChoice } if browser detection is unclear.
 */
export function resolveTimezone(country: string, browserTimezone?: string): {
  timezone: string;
  needsUserChoice: boolean;
  options?: string[];
} {
  const countryTimezones = getTimezonesForCountry(country);
  
  // Unknown country — fall back to browser timezone
  if (countryTimezones.length === 0) {
    return {
      timezone: browserTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      needsUserChoice: false,
    };
  }
  
  // Single timezone country — auto-assign
  if (countryTimezones.length === 1) {
    return {
      timezone: countryTimezones[0],
      needsUserChoice: false,
    };
  }
  
  // Multi-timezone country — check if browser timezone matches
  const detectedTz = browserTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (countryTimezones.includes(detectedTz)) {
    return {
      timezone: detectedTz,
      needsUserChoice: false,
    };
  }
  
  // Browser timezone doesn't match any of the country's timezones — ask user
  return {
    timezone: countryTimezones[0], // default to first
    needsUserChoice: true,
    options: countryTimezones,
  };
}

/**
 * Get current local time string in a given timezone.
 */
export function getCurrentTimeInTimezone(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return new Date().toLocaleTimeString();
  }
}
