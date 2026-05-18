import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseApp, isClient } from "./config";

let storage: FirebaseStorage | undefined;

export function getFirebaseStorage(): FirebaseStorage {
  if (!isClient()) {
    throw new Error("Firebase Storage is only available in the browser.");
  }
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}
