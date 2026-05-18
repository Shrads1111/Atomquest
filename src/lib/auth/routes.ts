import type { UserRole } from "./types";

export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "manager":
      return "/manager";
    case "admin":
      return "/admin";
    case "employee":
    default:
      return "/employee";
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "manager":
      return "Manager";
    case "admin":
      return "Administrator";
    case "employee":
    default:
      return "Employee";
  }
}
