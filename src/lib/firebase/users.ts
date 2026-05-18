import { FirebaseError } from "firebase/app";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import type { AuthUser, UserProfilePayload, UserRole } from "@/lib/auth/types";
import { getFirebaseDb } from "./config";

export interface FirestoreUserProfile {
  name: string;
  email: string;
  employeeId: string;
  department: string;
  role: UserRole;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

const USERS_COLLECTION = "users";

const RETRYABLE = new Set(["unavailable", "deadline-exceeded", "resource-exhausted"]);

function userProfileRef(uid: string) {
  return doc(getFirebaseDb(), USERS_COLLECTION, uid);
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const code = error instanceof FirebaseError ? error.code : "";
      if (RETRYABLE.has(code) && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function createUserProfile(
  uid: string,
  payload: UserProfilePayload,
): Promise<AuthUser> {
  const profile: FirestoreUserProfile = {
    name: payload.fullName,
    email: payload.email.toLowerCase(),
    employeeId: payload.employeeId,
    department: payload.department,
    role: payload.role,
    createdAt: serverTimestamp(),
  };

  await withRetry(() => setDoc(userProfileRef(uid), profile));

  return profileToAuthUser(uid, profile);
}

export async function fetchUserProfile(uid: string): Promise<AuthUser | null> {
  const snap = await withRetry(() => getDoc(userProfileRef(uid)));
  if (!snap.exists()) return null;
  return profileToAuthUser(uid, snap.data() as FirestoreUserProfile);
}

function profileToAuthUser(uid: string, profile: FirestoreUserProfile): AuthUser {
  return {
    id: uid,
    fullName: profile.name,
    email: profile.email,
    employeeId: profile.employeeId,
    department: profile.department,
    role: profile.role,
  };
}
