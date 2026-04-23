import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <PermissionsProvider>
      <Routes>
        <Route path="/" element={<RoleRouter />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={
            <RoleGuard allowedRoles={['super_admin', 'operator']}>
              <SuperAdminDashboard />
            </RoleGuard>
          } />
          <Route path="/employees" element={
            <RoleGuard allowedRoles={['super_admin']}>
              <EmployeeManagement />
            </RoleGuard>
          } />
          <Route path="/permissions" element={
            <RoleGuard allowedRoles={['super_admin']}>
              <PermissionsBoard />
            </RoleGuard>
          } />
          <Route path="/tasks" element={
            <RoleGuard allowedRoles={['super_admin', 'operator']}>
              <TaskBoard />
            </RoleGuard>
          } />
          <Route path="/my-tasks" element={
            <RoleGuard allowedRoles={['employee']}>
              <MyTasks />
            </RoleGuard>
          } />
          <Route path="/locations" element={
            <RoleGuard allowedRoles={['super_admin', 'operator']}>
              <Locations />
            </RoleGuard>
          } />
          <Route path="/clock-records" element={
            <RoleGuard allowedRoles={['super_admin', 'operator']}>
              <ClockRecords />
            </RoleGuard>
          } />
          <Route path="/employee-profile" element={
            <RoleGuard allowedRoles={['super_admin']}>
              <EmployeeProfile />
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
  )
}

export default App