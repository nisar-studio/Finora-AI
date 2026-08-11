import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Sparkles } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-10 animate-spin items-center justify-center rounded-xl bg-ink text-canvas">
            <Sparkles className="size-5 text-amber-400" />
          </div>
          <p className="text-sm text-ink-muted">Verifying authentication…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}