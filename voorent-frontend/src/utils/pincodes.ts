/**
 * Delhi NCR pincode validation
 * Covers: Delhi (110xxx), Noida/Greater Noida/Ghaziabad (201xxx),
 * Gurugram (122xxx), Faridabad (121xxx)
 */
const DELHI_NCR_PREFIXES = ['110', '121', '122', '201'];

export function isDelhibNCRPincode(pincode: string): boolean {
  if (!pincode || !/^\d{6}$/.test(pincode)) return false;
  return DELHI_NCR_PREFIXES.some((prefix) => pincode.startsWith(prefix));
}

export interface ServiceablePincode {
  pincode: string;
  area: string;
}

/**
 * Curated list of serviceable Delhi NCR pincodes with area names.
 * Powers the searchable dropdown so users pick an area we actually serve,
 * instead of typing an unserviceable pincode and being disappointed.
 * Not exhaustive — isDelhibNCRPincode() remains the authoritative gate.
 */
export const SERVICEABLE_PINCODES: ServiceablePincode[] = [
  // Delhi (110xxx)
  { pincode: '110001', area: 'Connaught Place, New Delhi' },
  { pincode: '110002', area: 'Darya Ganj, Delhi' },
  { pincode: '110005', area: 'Karol Bagh, Delhi' },
  { pincode: '110017', area: 'Saket, Delhi' },
  { pincode: '110019', area: 'Kalkaji, Delhi' },
  { pincode: '110024', area: 'Lajpat Nagar, Delhi' },
  { pincode: '110027', area: 'Rajouri Garden, Delhi' },
  { pincode: '110029', area: 'Hauz Khas / AIIMS, Delhi' },
  { pincode: '110034', area: 'Ashok Vihar, Delhi' },
  { pincode: '110037', area: 'Mahipalpur, Delhi' },
  { pincode: '110048', area: 'Greater Kailash, Delhi' },
  { pincode: '110058', area: 'Janakpuri, Delhi' },
  { pincode: '110063', area: 'Paschim Vihar, Delhi' },
  { pincode: '110070', area: 'Vasant Kunj, Delhi' },
  { pincode: '110075', area: 'Dwarka, Delhi' },
  { pincode: '110085', area: 'Rohini, Delhi' },
  { pincode: '110091', area: 'Mayur Vihar, Delhi' },
  { pincode: '110092', area: 'Vivek Vihar, Delhi' },
  // Gurugram (122xxx)
  { pincode: '122001', area: 'Gurugram City, Haryana' },
  { pincode: '122002', area: 'DLF / Sector 25, Gurugram' },
  { pincode: '122003', area: 'Sector 14, Gurugram' },
  { pincode: '122009', area: 'Sector 45, Gurugram' },
  { pincode: '122011', area: 'Sector 51, Gurugram' },
  { pincode: '122015', area: 'Sushant Lok, Gurugram' },
  { pincode: '122016', area: 'Sector 56, Gurugram' },
  { pincode: '122017', area: 'Sector 42, Gurugram' },
  { pincode: '122018', area: 'Sector 23, Gurugram' },
  { pincode: '122022', area: 'Sector 27, Gurugram' },
  { pincode: '122051', area: 'Sector 66, Gurugram' },
  { pincode: '122102', area: 'Manesar, Gurugram' },
  // Faridabad (121xxx)
  { pincode: '121001', area: 'Faridabad City, Haryana' },
  { pincode: '121002', area: 'NIT, Faridabad' },
  { pincode: '121003', area: 'Sector 15, Faridabad' },
  { pincode: '121004', area: 'Ballabgarh, Faridabad' },
  { pincode: '121006', area: 'Sector 21, Faridabad' },
  { pincode: '121009', area: 'Sector 37, Faridabad' },
  // Noida / Greater Noida / Ghaziabad (201xxx)
  { pincode: '201301', area: 'Noida Sector 1, UP' },
  { pincode: '201303', area: 'Noida Sector 62, UP' },
  { pincode: '201304', area: 'Noida Sector 78, UP' },
  { pincode: '201305', area: 'Noida Sector 137, UP' },
  { pincode: '201306', area: 'Noida Sector 128, UP' },
  { pincode: '201309', area: 'Greater Noida West, UP' },
  { pincode: '201310', area: 'Greater Noida, UP' },
  { pincode: '201313', area: 'Greater Noida (Alpha), UP' },
  { pincode: '201001', area: 'Ghaziabad City, UP' },
  { pincode: '201002', area: 'Ghaziabad (Nehru Nagar), UP' },
  { pincode: '201009', area: 'Ghaziabad (Vasundhara), UP' },
  { pincode: '201014', area: 'Indirapuram, Ghaziabad' },
];
