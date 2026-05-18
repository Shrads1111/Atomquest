import type { UserRole } from "./types";

export const AUTH_STORAGE_KEY = "goalsync_auth_session";
export const USERS_STORAGE_KEY = "goalsync_registered_users";

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Customer Success",
  "Finance",
  "Human Resources",
  "Operations",
  "Legal",
] as const;

export const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "employee", label: "Employee", description: "Personal goals & performance" },
  { value: "manager", label: "Manager", description: "Team oversight & approvals" },
  { value: "admin", label: "Admin", description: "Organization & system control" },
];

export const DEMO_ACCOUNTS = [
  {
    identifier: "employee@goalsync.com",
    password: "Demo@1234",
    user: {
      id: "demo-emp-001",
      fullName: "Aria Chen",
      email: "employee@goalsync.com",
      employeeId: "GS-10482",
      department: "Engineering",
      role: "employee" as const,
    },
  },
  {
    identifier: "manager@goalsync.com",
    password: "Demo@1234",
    user: {
      id: "demo-mgr-001",
      fullName: "Marcus Rivera",
      email: "manager@goalsync.com",
      employeeId: "GS-10021",
      department: "Engineering",
      role: "manager" as const,
    },
  },
  {
    identifier: "admin@goalsync.com",
    password: "Demo@1234",
    user: {
      id: "demo-adm-001",
      fullName: "Priya Sharma",
      email: "admin@goalsync.com",
      employeeId: "GS-10001",
      department: "Operations",
      role: "admin" as const,
    },
  },
];
