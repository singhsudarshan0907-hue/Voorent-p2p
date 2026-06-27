// Auth utility — stores only non-sensitive user info in localStorage.
// The JWT itself lives exclusively in the httpOnly cookie set by the server;
// it is never readable by JavaScript.

export interface UserInfo {
  id:    string;   // user UUID (used to filter own listings etc.)
  role:  string;   // "customer" | "owner" | "both" | "admin"
  name:  string;
  phone: string;
}

const KEY = 'user_info';

export function getUserInfo(): UserInfo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function setUserInfo(info: UserInfo): void {
  localStorage.setItem(KEY, JSON.stringify(info));
}

export function clearUserInfo(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem('user_name'); // legacy key — clean up
}

export function isLoggedIn(): boolean {
  return getUserInfo() !== null;
}

export function isAdmin(): boolean {
  return getUserInfo()?.role === 'admin';
}

export function isOwner(): boolean {
  const role = getUserInfo()?.role;
  return role === 'owner' || role === 'both' || role === 'admin';
}
