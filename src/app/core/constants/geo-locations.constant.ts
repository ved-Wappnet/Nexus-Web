export interface CityLocation {
  name: string;
  postalCodes: string;
}

export interface RegionLocation {
  name: string;
  cities: CityLocation[];
}

export interface CountryLocation {
  code: string; // ISO 2-letter short code: US, IN, GB, etc.
  name: string;
  dialCode: string; // e.g. +1, +91, +44
  flag: string; // Emoji flag: 🇺🇸, 🇮🇳, 🇬🇧
  phonePlaceholder: string;
  phoneMask: string; // e.g. '(###) ###-####' or '##### #####'
  phoneDigitCount: number; // Required digit count for phone validation
  regions: RegionLocation[];
}

export function applyPhoneMask(rawInput: string, mask: string): string {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) return '';

  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === '#') {
      formatted += digits[digitIndex++];
    } else {
      formatted += mask[i];
    }
  }

  return formatted;
}

export const SUPPORTED_COUNTRIES: CountryLocation[] = [
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    phonePlaceholder: '(555) 234-5678',
    phoneMask: '(###) ###-####',
    phoneDigitCount: 10,
    regions: [
      {
        name: 'California',
        cities: [
          { name: 'San Francisco', postalCodes: '94102, 94103, 94107, 94110' },
          { name: 'Los Angeles', postalCodes: '90001, 90012, 90028, 90210' },
          { name: 'San Diego', postalCodes: '92101, 92104, 92109, 92115' },
          { name: 'San Jose', postalCodes: '95110, 95112, 95125, 95128' },
          { name: 'Sacramento', postalCodes: '95814, 95816, 95825' },
        ],
      },
      {
        name: 'New York',
        cities: [
          { name: 'New York City', postalCodes: '10001, 10010, 10021, 10036' },
          { name: 'Buffalo', postalCodes: '14201, 14202, 14213, 14221' },
          { name: 'Rochester', postalCodes: '14604, 14607, 14614, 14620' },
        ],
      },
      {
        name: 'Texas',
        cities: [
          { name: 'Austin', postalCodes: '78701, 78704, 78745, 78759' },
          { name: 'Dallas', postalCodes: '75201, 75204, 75219, 75240' },
          { name: 'Houston', postalCodes: '77001, 77002, 77019, 77056' },
          { name: 'San Antonio', postalCodes: '78201, 78205, 78216' },
        ],
      },
      {
        name: 'Washington',
        cities: [
          { name: 'Seattle', postalCodes: '98101, 98104, 98109, 98121' },
          { name: 'Bellevue', postalCodes: '98004, 98005, 98007' },
        ],
      },
      {
        name: 'Illinois',
        cities: [
          { name: 'Chicago', postalCodes: '60601, 60611, 60614, 60654' },
          { name: 'Naperville', postalCodes: '60540, 60563, 60565' },
        ],
      },
    ],
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    phonePlaceholder: '98765 43210',
    phoneMask: '##### #####',
    phoneDigitCount: 10,
    regions: [
      {
        name: 'Maharashtra',
        cities: [
          { name: 'Mumbai', postalCodes: '400001, 400050, 400076, 400099' },
          { name: 'Pune', postalCodes: '411001, 411005, 411038, 411057' },
          { name: 'Nagpur', postalCodes: '440001, 440010, 440022' },
          { name: 'Nashik', postalCodes: '422001, 422005, 422009' },
        ],
      },
      {
        name: 'Karnataka',
        cities: [
          { name: 'Bengaluru', postalCodes: '560001, 560038, 560100, 560103' },
          { name: 'Mysuru', postalCodes: '570001, 570012, 570020' },
          { name: 'Mangaluru', postalCodes: '575001, 575003' },
        ],
      },
      {
        name: 'Delhi NCR',
        cities: [
          { name: 'New Delhi', postalCodes: '110001, 110020, 110075, 110092' },
          { name: 'Gurugram', postalCodes: '122001, 122018, 122022' },
          { name: 'Noida', postalCodes: '201301, 201307, 201310' },
        ],
      },
      {
        name: 'Tamil Nadu',
        cities: [
          { name: 'Chennai', postalCodes: '600001, 600017, 600096, 600113' },
          { name: 'Coimbatore', postalCodes: '641001, 641012, 641035' },
        ],
      },
      {
        name: 'Gujarat',
        cities: [
          { name: 'Ahmedabad', postalCodes: '380001, 380015, 380054' },
          { name: 'Surat', postalCodes: '395001, 395007, 395009' },
          { name: 'Vadodara', postalCodes: '390001, 390007, 390020' },
        ],
      },
      {
        name: 'Telangana',
        cities: [
          { name: 'Hyderabad', postalCodes: '500001, 500032, 500081, 500084' },
        ],
      },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    phonePlaceholder: '7911 123456',
    phoneMask: '#### ######',
    phoneDigitCount: 10,
    regions: [
      {
        name: 'Greater London',
        cities: [
          { name: 'Central London', postalCodes: 'EC1A, WC1A, SW1A, W1A' },
          { name: 'Westminster', postalCodes: 'SW1P, W1J, W1K' },
          { name: 'Croydon', postalCodes: 'CR0, CR2, CR9' },
        ],
      },
      {
        name: 'West Midlands',
        cities: [
          { name: 'Birmingham', postalCodes: 'B1, B2, B15, B29' },
          { name: 'Coventry', postalCodes: 'CV1, CV3, CV6' },
        ],
      },
      {
        name: 'Greater Manchester',
        cities: [
          { name: 'Manchester', postalCodes: 'M1, M2, M14, M20' },
          { name: 'Salford', postalCodes: 'M3, M5, M50' },
        ],
      },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    phonePlaceholder: '151 12345678',
    phoneMask: '### ########',
    phoneDigitCount: 11,
    regions: [
      {
        name: 'Berlin',
        cities: [
          { name: 'Berlin Mitte', postalCodes: '10115, 10117, 10178' },
          { name: 'Charlottenburg', postalCodes: '10585, 10623, 10629' },
        ],
      },
      {
        name: 'Bavaria',
        cities: [
          { name: 'Munich', postalCodes: '80331, 80802, 81675' },
          { name: 'Nuremberg', postalCodes: '90402, 90408, 90443' },
        ],
      },
      {
        name: 'North Rhine-Westphalia',
        cities: [
          { name: 'Cologne', postalCodes: '50667, 50933, 51103' },
          { name: 'Düsseldorf', postalCodes: '40212, 40213, 40474' },
        ],
      },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    phonePlaceholder: '(416) 555-0199',
    phoneMask: '(###) ###-####',
    phoneDigitCount: 10,
    regions: [
      {
        name: 'Ontario',
        cities: [
          { name: 'Toronto', postalCodes: 'M5H, M5V, M4W, M1B' },
          { name: 'Ottawa', postalCodes: 'K1P, K1A, K2P' },
          { name: 'Mississauga', postalCodes: 'L5B, L5V, L4Z' },
        ],
      },
      {
        name: 'British Columbia',
        cities: [
          { name: 'Vancouver', postalCodes: 'V6B, V6E, V6Z, V5K' },
          { name: 'Victoria', postalCodes: 'V8W, V8V, V8T' },
        ],
      },
      {
        name: 'Quebec',
        cities: [
          { name: 'Montreal', postalCodes: 'H3B, H2Y, H4A' },
          { name: 'Quebec City', postalCodes: 'G1R, G1S' },
        ],
      },
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    phonePlaceholder: '50 123 4567',
    phoneMask: '## ### ####',
    phoneDigitCount: 9,
    regions: [
      {
        name: 'Dubai',
        cities: [
          { name: 'Downtown Dubai', postalCodes: 'DUB-01, DUB-04' },
          { name: 'Dubai Marina', postalCodes: 'DUB-12, DUB-14' },
          { name: 'Deira', postalCodes: 'DUB-02, DUB-08' },
        ],
      },
      {
        name: 'Abu Dhabi',
        cities: [
          { name: 'Abu Dhabi City', postalCodes: 'AUH-01, AUH-05' },
          { name: 'Al Ain', postalCodes: 'ALN-01, ALN-03' },
        ],
      },
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '🇸🇬',
    phonePlaceholder: '9123 4567',
    phoneMask: '#### ####',
    phoneDigitCount: 8,
    regions: [
      {
        name: 'Central Region',
        cities: [
          { name: 'Downtown Core', postalCodes: '018989, 049318, 069542' },
          { name: 'Orchard', postalCodes: '238801, 238897' },
        ],
      },
      {
        name: 'East Region',
        cities: [
          { name: 'Changi Logistics Zone', postalCodes: '819642, 819663' },
        ],
      },
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    phonePlaceholder: '412 345 678',
    phoneMask: '### ### ###',
    phoneDigitCount: 9,
    regions: [
      {
        name: 'New South Wales',
        cities: [
          { name: 'Sydney', postalCodes: '2000, 2010, 2060, 2150' },
          { name: 'Newcastle', postalCodes: '2300, 2302' },
        ],
      },
      {
        name: 'Victoria',
        cities: [
          { name: 'Melbourne', postalCodes: '3000, 3004, 3053, 3141' },
          { name: 'Geelong', postalCodes: '3220, 3216' },
        ],
      },
    ],
  },
];
