const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const PHONE_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone';

export interface TokenPayload {
  role: string;
  phone: string;
  sub: string;
}

export function decodeToken(): TokenPayload | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      role:  payload[ROLE_CLAIM]  || payload['role']  || 'customer',
      phone: payload[PHONE_CLAIM] || payload['phone'] || '',
      sub:   payload['sub']       || '',
    };
  } catch {
    return null;
  }
}

export function isOwner(): boolean {
  const p = decodeToken();
  return p?.role === 'owner' || p?.role === 'both';
}
