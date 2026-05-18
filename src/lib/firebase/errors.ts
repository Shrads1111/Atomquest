import { FirebaseError } from "firebase/app";

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/configuration-not-found":
    "Firebase Authentication is not set up. Open Firebase Console → Authentication → Get started, then enable Email/Password.",
  "auth/operation-not-allowed":
    "Email/password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
  "auth/weak-password": "Password is too weak. Use at least 8 characters with mixed case and numbers.",
  "auth/user-disabled": "This account has been disabled. Contact your administrator.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/invalid-api-key":
    "Invalid Firebase API key. Check .env.local — remove quotes and trailing commas.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/popup-blocked": "Popup was blocked. Allow popups for this site and try again.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method. Use email/password instead.",
  "permission-denied":
    "Firestore blocked this action. In Firebase Console → Firestore → Rules, allow signed-in users to read/write users/{userId}.",
  "failed-precondition":
    "Cloud Firestore is not enabled. In Firebase Console → Firestore Database → Create database (production or test mode).",
  "not-found":
    "Firestore database not found. Create a Firestore database in Firebase Console for this project.",
  unavailable:
    "Could not reach Firestore. Create a Firestore database in Firebase Console, check your network, or disable VPN/ad-blockers and retry.",
};

function messageFromFirestoreText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("has not been used") || lower.includes("does not exist")) {
    return MESSAGES["failed-precondition"];
  }
  if (lower.includes("permission") || lower.includes("insufficient permissions")) {
    return MESSAGES["permission-denied"];
  }
  return null;
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const fromCode = MESSAGES[error.code];
    if (fromCode) return fromCode;
    const fromText = messageFromFirestoreText(error.message);
    if (fromText) return fromText;
    return error.message;
  }
  if (error instanceof Error) {
    const fromText = messageFromFirestoreText(error.message);
    if (fromText) return fromText;
    for (const [code, message] of Object.entries(MESSAGES)) {
      if (error.message.includes(code)) return message;
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
