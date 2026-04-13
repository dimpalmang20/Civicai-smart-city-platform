const TOKEN_KEY = "civicai_token";
const USER_KEY = "civicai_user";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
  department?: string;
  points?: number;
  [k: string]: unknown;
};

export function useAuth() {
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const getAuthUser = (): AuthUser | null => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? (JSON.parse(u) as AuthUser) : null;
    } catch {
      return null;
    }
  };

  /** Authority UI reads the same session when `role === "authority"`. */
  const getAuthorityUser = (): AuthUser | null => {
    const u = getAuthUser();
    return u?.role === "authority" ? u : null;
  };

  const persistSession = (user: AuthUser, token?: string | null) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("storage"));
  };

  const loginUser = (user: AuthUser, token?: string | null) => {
    persistSession(user, token);
  };

  const loginAuthority = (user: AuthUser, token?: string | null) => {
    persistSession(user, token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("storage"));
  };

  return { getToken, getAuthUser, getAuthorityUser, loginUser, loginAuthority, logout };
}
