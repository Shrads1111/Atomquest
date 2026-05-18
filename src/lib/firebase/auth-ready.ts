import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./config";

let authReadyPromise: Promise<User | null> | null = null;
let authReadyResolved = false;

/** Resolves once Firebase emits the first auth state (for route guards). */
export function waitForAuthInit(): Promise<User | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!isFirebaseConfigured()) return Promise.resolve(null);

  if (authReadyResolved) {
    return Promise.resolve(getFirebaseAuth().currentUser);
  }

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
        if (!authReadyResolved) {
          authReadyResolved = true;
          resolve(user);
        }
        unsubscribe();
      });
    });
  }

  return authReadyPromise;
}

export function resetAuthReady(): void {
  authReadyResolved = false;
  authReadyPromise = null;
}
