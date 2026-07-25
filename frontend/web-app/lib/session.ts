export function getAuthToken(): string {
  if (typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  const token = window.localStorage.getItem("core_access_token") || window.sessionStorage.getItem("core_access_token");
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}