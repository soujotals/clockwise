
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Clock } from "lucide-react";
import Dashboard from "@/components/Dashboard";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (authLoading) {
    return (
      <div className="dark bg-background flex min-h-screen items-center justify-center">
        <Clock className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return null; // ou um componente de "redirecionando..."
  }

  return <Dashboard user={user} />;
}
