import { redirect } from "@tanstack/react-router";
import { getDashboardPathForRole } from "./routes";
import { getStoredUser } from "./storage";
import type { AuthUser, UserRole } from "./types";
import { waitForAuthInit } from "@/lib/firebase/auth-ready";
import { isFirebaseConfigured } from "@/lib/firebase/config";

const ROLE_RANK: Record<UserRole, number> = {
  employee: 1,
  manager: 2,
  admin: 3,
};

export async function getOptionalAuthUser(): Promise<AuthUser | null> {
  if (isFirebaseConfigured()) {
    await waitForAuthInit();
  }
  return getStoredUser();
}

export async function requireAuth(): Promise<AuthUser> {
  if (isFirebaseConfigured()) {
    await waitForAuthInit();
  }
  const user = getStoredUser();
  if (!user) {
    throw redirect({ to: "/" });
  }
  return user;
}

export async function requireRole(minRole: UserRole): Promise<AuthUser> {
  const user = await requireAuth();
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw redirect({ to: getDashboardPathForRole(user.role) });
  }
  return user;
}

export async function requireExactRoles(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw redirect({ to: getDashboardPathForRole(user.role) });
  }
  return user;
}
