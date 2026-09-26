// District coordinates used to place text locations on a map.
// These mirror DISTRICT_COORDINATES in backend/core/dgda_views.py; keep the two in step.
export const DISTRICT_COORDINATES = {
    'Dhaka': [23.8103, 90.4125],
    'Chattogram': [22.3569, 91.7832],
    'Khulna': [22.8456, 89.5403],
    'Rajshahi': [24.3745, 88.6042],
    'Sylhet': [24.8949, 91.8687],
    'Barishal': [22.7010, 90.3535],
    'Rangpur': [25.7439, 89.2752],
    'Mymensingh': [24.7471, 90.4203],
    'Gazipur': [23.9999, 90.4203],
    'Narayanganj': [23.6238, 90.5000],
    'Cumilla': [23.4607, 91.1809],
    'Jashore': [23.1664, 89.2081],
    'Bogura': [24.8465, 89.3773],
    'Narsingdi': [23.9322, 90.7151],
    "Cox's Bazar": [21.4272, 92.0058],
};

export const DISTRICTS = Object.keys(DISTRICT_COORDINATES);

// Longest first, so "Cox's Bazar" is matched before any shorter name it contains.
const BY_LENGTH = [...DISTRICTS].sort((a, b) => b.length - a.length);

// For locations this app writes itself, stored as "District, detail". The backend
// reads the district from the part before the first comma, so match it the same way.
export const districtOf = (location) => {
    const head = (location || '').split(',')[0].trim().toLowerCase();
    return DISTRICTS.find((district) => district.toLowerCase() === head) || null;
};

// For addresses typed by someone else, where the district can sit anywhere in the
// line ("Mirpur Road, Kalabagan, Dhaka"). Returns null rather than guessing when no
// known district is named.
export const findDistrict = (text) => {
    const haystack = (text || '').toLowerCase();
    if (!haystack) return null;
    return BY_LENGTH.find((district) => haystack.includes(district.toLowerCase())) || null;
};
