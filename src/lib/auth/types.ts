export type UserRole = "employee" | "manager" | "admin";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  rememberMe?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  employeeId: string;
  password: string;
  department: string;
  role: UserRole;
}

/** Profile fields saved to Firestore (email/password or OAuth). */
export type UserProfilePayload = Omit<RegisterPayload, "password">;

export interface PendingGoogleProfile {
  uid: string;
  email: string;
  fullName: string;
}
