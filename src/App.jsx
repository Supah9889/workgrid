import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { PermissionsProvider } from '@/lib/permissions.jsx';

import AppLayout from '@/components/layout/AppLayout';
import RoleRouter from '@/components/RoleRouter';
import RoleGuard from '@/components/RoleGuard';

import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import EmployeeManagement from '@/pages/EmployeeManagement';
import PermissionsBoard from '@/pages/PermissionsBoard';
import TaskBoard from '@/pages/TaskBoard';
import MyTasks from '@/pages/MyTasks';
import Locations from '@/pages/Locations';
import ClockRecords from '@/pages/ClockRecords';
import EmployeeProfile from '@/pages/EmployeeProfile';
import EmployeeRepository from '@/pages/EmployeeRepository';
import Onboarding from '@/pages/Onboarding';
import PinLogin from '@/pages/PinLogin';
import AuditLog from '@/pages/AuditLog';
import GeofenceSettings from '@/pages/GeofenceSettings';
import ContactDirectory from '@/pages/ContactDirectory';
import SecurityDashboard from '@/pages/SecurityDashboard';
import PayrollSummary from '@/pages/PayrollSummary';
import Analytics from '@/pages/Analytics';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, needsOnboarding, user } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading WorkGrid...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  if (needsOnboarding &&
      user?.has_onboarded === false &&
      location.pathname !== '/onboarding' &&
      !sessionStorage.getItem('onboarding_complete')) {
    return <Navigate to="/onboarding" replace />;
  }

  const pinVerified = sessionStorage.getItem('pin_verified') === 'true';
  if (!needsOnboarding && !pinVerified && user?.pin_hash && location.pathname !== '/pin-login') {
    return <Navigate to="/pin-login" replace />;
  }

  return (
    <PermissionsProvider>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/pin-login" element={<PinLogin />} />
        <Route path="/" element={<RoleRouter />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']}>
              <SuperAdminDashboard />
            </RoleGuard>
          } />
          <Route path="/employees" element={
            <RoleGuard allowedRoles={['super_admin', 'owner']}>
              <EmployeeManagement />
            </RoleGuard>
          } />
          <Route path="/permissions" element={
            <RoleGuard allowedRoles={['super_admin', 'owner']}>
              <PermissionsBoard />
            </RoleGuard>
          } />
          <Route path="/tasks" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']} permission="view_all_tasks">
              <TaskBoard />
            </RoleGuard>
          } />
          <Route path="/my-tasks" element={
            <RoleGuard allowedRoles={['employee']}>
              <MyTasks />
            </RoleGuard>
          } />
          <Route path="/locations" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']} permission="view_employee_locations">
              <Locations />
            </RoleGuard>
          } />
          <Route path="/clock-records" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']} permission="view_clock_records">
              <ClockRecords />
            </RoleGuard>
          } />
          <Route path="/employees/:id" element={
            <RoleGuard allowedRoles={['super_admin', 'owner']}>
              <EmployeeProfile />
            </RoleGuard>
          } />
          <Route path="/employees/repository" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']}>
              <EmployeeRepository />
            </RoleGuard>
          } />
          <Route path="/audit-log" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']} permission="view_clock_records">
              <AuditLog />
            </RoleGuard>
          } />
          <Route path="/geofence-settings" element={
            <RoleGuard allowedRoles={['super_admin', 'owner']}>
              <GeofenceSettings />
            </RoleGuard>
          } />
          <Route path="/contact-directory" element={
            <RoleGuard allowedRoles={['super_admin', 'owner', 'operator', 'employee']}>
              <ContactDirectory />
            </RoleGuard>
          } />
          <Route path="/payroll" element={
            <RoleGuard allowedRoles={['super_admin', 'owner']}>
              <PayrollSummary />
            </RoleGuard>
          } />
          <Route path="/analytics" element={
            <RoleGuard allowedRoles={['super_admin', 'operator', 'owner']}>
              <Analytics />
            </RoleGuard>
          } />
          <Route path="/security-dashboard" element={
            <RoleGuard allowedRoles={['super_admin', 'owner']}>
              <SecurityDashboard />
            </RoleGuard>
          } />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </PermissionsProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;