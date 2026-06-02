"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from "./firebase";
import type { AppUser, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  isPending: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  isPending: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.status === "pending") {
            setAppUser(null);
            setIsPending(true);
          } else {
            setAppUser({ uid: firebaseUser.uid, ...data } as AppUser);
            setIsPending(false);
          }
        } else {
          // 初回ログイン: 承認待ちユーザーを自動作成
          await setDoc(userRef, {
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
            role: "owner",
            status: "pending",
            storeIds: [],
            createdAt: Timestamp.now(),
          });
          setAppUser(null);
          setIsPending(true);
        }
      } else {
        setAppUser(null);
        setIsPending(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  };

  const signOut = async () => {
    await fbSignOut(getFirebaseAuth());
    setAppUser(null);
    setIsPending(false);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, isPending, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function useRequireRole(allowedRoles: UserRole[]) {
  const { appUser, loading } = useAuth();
  const hasAccess = !loading && appUser !== null && appUser.status === "active" && allowedRoles.includes(appUser.role);
  return { appUser, loading, hasAccess };
}
