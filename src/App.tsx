/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AdminDashboardPage } from './components/admin/AdminDashboardPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicInvitationPage } from './components/invitation/PublicInvitationPage';
import { testFirestoreConnection } from './lib/firebase';

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    void testFirestoreConnection();
    const handlePop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      setPathname(to);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <ErrorBoundary>
      {isAdminRoute ? (
        <AdminDashboardPage onNavigatePublic={() => navigate('/')} />
      ) : (
        <PublicInvitationPage onNavigateAdmin={() => navigate('/admin')} />
      )}
    </ErrorBoundary>
  );
}
