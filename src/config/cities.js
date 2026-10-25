/**
 * Centralized Indian Cities and Areas Configuration for AirSense
 * Provides accurate coordinates, state, and regional groupings.
 */

export const CITIES = [
  // Maharashtra & Mumbai Metropolitan Region (MMR)
  {
    id: "mumbai",
    name: "Mumbai",
    area: "Greater Mumbai",
    state: "Maharashtra",
    region: "Western India",
    latitude: 19.076,
    longitude: 72.8777,
    description: "Financial Capital / Coastal Metro",
    isPopular: true,
  },
  {
    id: "navi-mumbai",
    name: "Navi Mumbai",
    area: "CBD Belapur / Vashi",
    state: "Maharashtra",
    region: "Western India",
    latitude: 19.033,
    longitude: 73.0297,
    description: "Planned Satellite City, MMR",
    isPopular: true,
  },
  {
    id: "thane",
    name: "Thane",
    area: "Thane City",
    state: "Maharashtra",
    region: "Western India",
    latitude: 19.2183,
    longitude: 72.9781,
    description: "Lakes City / MMR Northern Hub",
    isPopular: true,
  },
  {
    id: "pune",
    name: "Pune",
    area: "Pune Metropolitan",
    state: "Maharashtra",
    region: "Western India",
    latitude: 18.5204,
    longitude: 73.8567,
    description: "IT & Cultural Hub, Western Ghats",
    isPopular: true,
  },
  {
    id: "nagpur",
    name: "Nagpur",
    area: "Nagpur Urban",
    state: "Maharashtra",
    region: "Western India",
    latitude: 21.1458,
    longitude: 79.0882,
    description: "Central India Gateway",
    isPopular: false,
  },

  // Northern India & NCR
  {
    id: "delhi",
    name: "Delhi",
    area: "National Capital Territory",
    state: "Delhi (NCR)",
    region: "Northern India",
    latitude: 28.6139,
    longitude: 77.209,
    description: "National Capital Region Core",
    isPopular: true,
  },
  {
    id: "noida",
    name: "Noida",
    area: "Gautam Buddha Nagar",
    state: "Uttar Pradesh (NCR)",
    region: "Northern India",
    latitude: 28.5355,
    longitude: 77.391,
    description: "Eastern NCR Urban Center",
    isPopular: false,
  },
  {
    id: "gurugram",
    name: "Gurugram",
    area: "Cyber City",
    state: "Haryana (NCR)",
    region: "Northern India",
    latitude: 28.4595,
    longitude: 77.0266,
    description: "Southern NCR Business Hub",
    isPopular: false,
  },
  {
    id: "jaipur",
    name: "Jaipur",
    area: "Pink City",
    state: "Rajasthan",
    region: "Northern India",
    latitude: 26.9124,
    longitude: 75.7873,
    description: "Capital of Rajasthan",
    isPopular: false,
  },
  {
    id: "lucknow",
    name: "Lucknow",
    area: "Lucknow City",
    state: "Uttar Pradesh",
    region: "Northern India",
    latitude: 26.8467,
    longitude: 80.9462,
    description: "Capital of Uttar Pradesh",
    isPopular: false,
  },
  {
    id: "chandigarh",
    name: "Chandigarh",
    area: "Chandigarh Capital",
    state: "Chandigarh (UT)",
    region: "Northern India",
    latitude: 30.7333,
    longitude: 76.7794,
    description: "Joint Capital / Sub-Himalayan",
    isPopular: false,
  },

  // Southern India
  {
    id: "bengaluru",
    name: "Bengaluru",
    area: "Bangalore Urban",
    state: "Karnataka",
    region: "Southern India",
    latitude: 12.9716,
    longitude: 77.5946,
    description: "Silicon Valley of India",
    isPopular: true,
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    area: "Cyberabad / Twin Cities",
    state: "Telangana",
    region: "Southern India",
    latitude: 17.385,
    longitude: 78.4867,
    description: "Capital of Telangana",
    isPopular: true,
  },
  {
    id: "chennai",
    name: "Chennai",
    area: "Greater Chennai",
    state: "Tamil Nadu",
    region: "Southern India",
    latitude: 13.0827,
    longitude: 80.2707,
    description: "Coromandel Coast Metropolis",
    isPopular: true,
  },

  // Western India
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    area: "Ahmedabad Urban",
    state: "Gujarat",
    region: "Western India",
    latitude: 23.0225,
    longitude: 72.5714,
    description: "Commercial Capital of Gujarat",
    isPopular: true,
  },
  {
    id: "surat",
    name: "Surat",
    area: "Surat Metropolis",
    state: "Gujarat",
    region: "Western India",
    latitude: 21.1702,
    longitude: 72.8311,
    description: "Textile & Diamond City",
    isPopular: false,
  },

  // Eastern India
  {
    id: "kolkata",
    name: "Kolkata",
    area: "Greater Kolkata",
    state: "West Bengal",
    region: "Eastern India",
    latitude: 22.5726,
    longitude: 88.3639,
    description: "Cultural Capital of India",
    isPopular: true,
  },
  {
    id: "patna",
    name: "Patna",
    area: "Patna Urban",
    state: "Bihar",
    region: "Eastern India",
    latitude: 25.5941,
    longitude: 85.1376,
    description: "Gangetic Plains Capital",
    isPopular: false,
  },

  // Central India
  {
    id: "bhopal",
    name: "Bhopal",
    area: "City of Lakes",
    state: "Madhya Pradesh",
    region: "Central India",
    latitude: 23.2599,
    longitude: 77.4126,
    description: "Capital of Madhya Pradesh",
    isPopular: false,
  },
  {
    id: "indore",
    name: "Indore",
    area: "Indore Metro",
    state: "Madhya Pradesh",
    region: "Central India",
    latitude: 22.7196,
    longitude: 75.8577,
    description: "Cleanest City / Malwa Region",
    isPopular: false,
  },
];

export const DEFAULT_CITY_ID = "mumbai";

export const CITIES_MAP = CITIES.reduce((acc, city) => {
  acc[city.id] = city;
  return acc;
}, {});

export function getCityById(id) {
  return CITIES_MAP[id] || CITIES_MAP[DEFAULT_CITY_ID];
}

// Group cities by State for structured dropdown presentation
export const CITIES_BY_STATE = CITIES.reduce((acc, city) => {
  if (!acc[city.state]) {
    acc[city.state] = [];
  }
  acc[city.state].push(city);
  return acc;
}, {});

// Group cities by Region
export const CITIES_BY_REGION = CITIES.reduce((acc, city) => {
  if (!acc[city.region]) {
    acc[city.region] = [];
  }
  acc[city.region].push(city);
  return acc;
}, {});

export const POPULAR_CITIES = CITIES.filter((c) => c.isPopular);
