import { onAuthStateChanged } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  cancelGoogleSignIn,
  completeGoogleProfile as completeGoogleProfileService,
  loginWithEmail,
  loginWithGoogle as loginWithGoogleService,
  logoutFirebase,
  registerWithEmail,
  resolveUserFromFirebaseUid,
  sendPasswordReset,
} from "@/lib/auth/auth-service";
import { getDashboardPathForRole } from "@/lib/auth/routes";
import { clearStoredSession, persistSession } from "@/lib/auth/storage";
import type {
  AuthUser,
  LoginPayload,
  PendingGoogleProfile,
  RegisterPayload,
  UserProfilePayload,
} from "@/lib/auth/types";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { resetAuthReady } from "@/lib/firebase/auth-ready";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingGoogleProfile: PendingGoogleProfile | null;
  login: (payload: LoginPayload) => Promise<string>;
  register: (payload: RegisterPayload) => Promise<string>;
  loginWithGoogle: () => Promise<string | null>;
  completeGoogleProfile: (payload: UserProfilePayload) => Promise<string>;
  cancelGoogleProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingGoogleProfile, setPendingGoogleProfile] =
    useState<PendingGoogleProfile | null>(null);
  const pendingProfileUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await resolveUserFromFirebaseUid(firebaseUser.uid);
        if (profile) {
          pendingProfileUidRef.current = null;
          setPendingGoogleProfile(null);
          persistSession({ user: profile });
          setUser(profile);
        } else if (pendingProfileUidRef.current === firebaseUser.uid) {
          // Google sign-in waiting for profile form — keep Firebase session
        } else {
          clearStoredSession();
          setUser(null);
        }
      } else {
        pendingProfileUidRef.current = null;
        setPendingGoogleProfile(null);
        clearStoredSession();
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const profile = await loginWithEmail(payload);
    persistSession({ user: profile, rememberMe: payload.rememberMe });
    setUser(profile);
    return getDashboardPathForRole(profile.role);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const profile = await registerWithEmail(payload);
    persistSession({ user: profile, rememberMe: true });
    setUser(profile);
    return getDashboardPathForRole(profile.role);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const result = await loginWithGoogleService();
    if (result.status === "complete") {
      pendingProfileUidRef.current = null;
      setPendingGoogleProfile(null);
      persistSession({ user: result.user, rememberMe: true });
      setUser(result.user);
      return getDashboardPathForRole(result.user.role);
    }
    pendingProfileUidRef.current = result.uid;
    setPendingGoogleProfile({
      uid: result.uid,
      email: result.email,
      fullName: result.fullName,
    });
    return null;
  }, []);

  const completeGoogleProfile = useCallback(
    async (payload: UserProfilePayload) => {
      if (!pendingGoogleProfile) {
        throw new Error("No Google sign-in in progress.");
      }
      const profile = await completeGoogleProfileService(
        pendingGoogleProfile.uid,
        payload,
      );
      pendingProfileUidRef.current = null;
      setPendingGoogleProfile(null);
      persistSession({ user: profile, rememberMe: true });
      setUser(profile);
      return getDashboardPathForRole(profile.role);
    },
    [pendingGoogleProfile],
  );

  const cancelGoogleProfile = useCallback(async () => {
    pendingProfileUidRef.current = null;
    setPendingGoogleProfile(null);
    await cancelGoogleSignIn();
    clearStoredSession();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await sendPasswordReset(email);
  }, []);

  const logout = useCallback(async () => {
    pendingProfileUidRef.current = null;
    setPendingGoogleProfile(null);
    await logoutFirebase();
    clearStoredSession();
    setUser(null);
    resetAuthReady();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      pendingGoogleProfile,
      login,
      register,
      loginWithGoogle,
      completeGoogleProfile,
      cancelGoogleProfile,
      forgotPassword,
      logout,
    }),
    [
      user,
      isLoading,
      pendingGoogleProfile,
      login,
      register,
      loginWithGoogle,
      completeGoogleProfile,
      cancelGoogleProfile,
      forgotPassword,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
