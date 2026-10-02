export function isAdminRole(role?: string | null) {
  return role === "PLATFORM_ADMIN" || role === "ADMIN";
}
