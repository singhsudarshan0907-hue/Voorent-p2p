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
