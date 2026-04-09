export function useAuth() {
  const getAuthUser = () => {
    try {
      const u = localStorage.getItem("civicai_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };

  const getAuthorityUser = () => {
    try {
      const u = localStorage.getItem("civicai_authority");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };

  const loginUser = (user: any) => {
    localStorage.setItem("civicai_user", JSON.stringify(user));
    window.dispatchEvent(new Event("storage"));
  };

  const loginAuthority = (user: any) => {
    localStorage.setItem("civicai_authority", JSON.stringify(user));
    window.dispatchEvent(new Event("storage"));
  };

  const logout = () => {
    localStorage.removeItem("civicai_user");
    localStorage.removeItem("civicai_authority");
    window.dispatchEvent(new Event("storage"));
  };

  return { getAuthUser, getAuthorityUser, loginUser, loginAuthority, logout };
}