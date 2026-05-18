import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { createUserProfile, fetchUserProfile } from "@/lib/firebase/users";
import type {
  AuthUser,
  LoginPayload,
  PendingGoogleProfile,
  RegisterPayload,
  UserProfilePayload,
} from "./types";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export type GoogleSignInResult =
  | { status: "complete"; user: AuthUser }
  | ({ status: "needs_profile" } & PendingGoogleProfile);

async function setAuthPersistence(rememberMe: boolean): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return;
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence,
    );
  } catch {
    // Persistence may already be set; non-fatal
  }
}

function rethrowAuthError(error: unknown): never {
  if (error instanceof Error && error.message.startsWith("Firebase")) {
    throw error;
  }
  throw new Error(getFirebaseErrorMessage(error));
}

export async function loginWithEmail(payload: LoginPayload): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. See .env.example.");
  }

  try {
    await setAuthPersistence(!!payload.rememberMe);
    const credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      payload.email.trim().toLowerCase(),
      payload.password,
    );

    const profile = await fetchUserProfile(credential.user.uid);
    if (!profile) {
      throw new Error(
        "Account exists but profile is missing in Firestore. Sign up again or ask an admin to add your users/{uid} document.",
      );
    }
    return profile;
  } catch (error) {
    rethrowAuthError(error);
  }
}

export async function registerWithEmail(payload: RegisterPayload): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. See .env.example.");
  }

  const auth = getFirebaseAuth();
  let uid: string | null = null;

  try {
    await setAuthPersistence(true);
    const credential = await createUserWithEmailAndPassword(
      auth,
      payload.email.trim().toLowerCase(),
      payload.password,
    );
    uid = credential.user.uid;

    await updateProfile(credential.user, { displayName: payload.fullName });

    const { password: _pw, ...profile } = payload;
    return await createUserProfile(credential.user.uid, profile);
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : "";
    const isFirestoreRules = code === "permission-denied";
    if (uid && isFirestoreRules) {
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
    }
    rethrowAuthError(error);
  }
}

export async function logoutFirebase(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await signOut(getFirebaseAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. See .env.example.");
  }

  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
  } catch (error) {
    rethrowAuthError(error);
  }
}

export async function loginWithGoogle(): Promise<GoogleSignInResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. See .env.example.");
  }

  try {
    await setAuthPersistence(true);
    const credential = await signInWithPopup(getFirebaseAuth(), googleProvider);
    const fbUser = credential.user;

    if (fbUser.displayName && fbUser.displayName !== fbUser.email) {
      await updateProfile(fbUser, { displayName: fbUser.displayName });
    }

    const profile = await fetchUserProfile(fbUser.uid);
    if (profile) {
      return { status: "complete", user: profile };
    }

    if (!fbUser.email) {
      throw new Error("Google account has no email. Use a Google account with an email address.");
    }

    return {
      status: "needs_profile",
      uid: fbUser.uid,
      email: fbUser.email,
      fullName: fbUser.displayName?.trim() || fbUser.email.split("@")[0] || "User",
    };
  } catch (error) {
    rethrowAuthError(error);
  }
}

export async function completeGoogleProfile(
  uid: string,
  payload: UserProfilePayload,
): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. See .env.example.");
  }

  const auth = getFirebaseAuth();
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error("Session expired. Please sign in with Google again.");
  }

  try {
    await updateProfile(auth.currentUser, { displayName: payload.fullName });
    return await createUserProfile(uid, payload);
  } catch (error) {
    rethrowAuthError(error);
  }
}

export async function cancelGoogleSignIn(): Promise<void> {
  await logoutFirebase();
}

export async function resolveUserFromFirebaseUid(uid: string): Promise<AuthUser | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    return await fetchUserProfile(uid);
  } catch {
    return null;
  }
}
