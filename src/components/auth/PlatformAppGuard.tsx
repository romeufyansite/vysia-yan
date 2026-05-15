import type { ReactNode } from 'react';
import { useMembership } from '@/contexts/MembershipContext';

function RouteRedirectSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

/** Keeps managers/teammates in the main product; sends administrators to the admin app. */
export function ManagerAppGuard({ children }: { children: ReactNode }) {
  const { membership, loading } = useMembership();

  if (loading) {
    return <RouteRedirectSpinner />;
  }

  if (membership?.platformRole === 'admin') {
    window.location.hash = '/admin';
    return null;
  }

  return <>{children}</>;
}

/** Restricts the admin UI to platform administrators only. */
export function AdminAppGuard({ children }: { children: ReactNode }) {
  const { membership, loading } = useMembership();

  if (loading) {
    return <RouteRedirectSpinner />;
  }

  if (membership?.platformRole !== 'admin') {
    window.location.hash = '/screens';
    return null;
  }

  return <>{children}</>;
}
