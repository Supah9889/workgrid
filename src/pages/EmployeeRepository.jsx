import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, Mail, Phone, UserCircle, MessageSquare, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';

const ROLE_STYLES = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  operator: 'bg-blue-100 text-blue-700 border-blue-200',
  employee: 'bg-slate-100 text-slate-600 border-slate-200',
};
const ROLE_LABELS = { super_admin: 'Owner/Admin', operator: 'Operator', employee: 'Employee' };

function StatusDot({ clockedIn }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${clockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
  );
}

function EmployeeCard({ emp, isClockedIn, onViewProfile, onMessage }) {
  const initials = (emp.full_name || emp.email || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Avatar + status */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary flex-shrink-0">
          {emp.photo_url
            ? <img src={emp.photo_url} alt={emp.full_name} className="w-12 h-12 rounded-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusDot clockedIn={isClockedIn} />
            <h3 className="font-semibold text-sm truncate">{emp.full_name || '—'}</h3>
          </div>
          <Badge variant="outline" className={`mt-1 text-[10px] ${ROLE_STYLES[emp.role] || ROLE_STYLES.employee}`}>
            {ROLE_LABELS[emp.role] || 'Employee'}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isClockedIn ? '🟢 Clocked In' : '⚫ Clocked Out'}
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{emp.email}</span>
        </div>
        {emp.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{emp.phone}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => onViewProfile(emp)}>
          <UserCircle className="w-3 h-3" /> Profile
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => onMessage(emp)}>
          <MessageSquare className="w-3 h-3" /> Message
        </Button>
      </div>
    </div>
  );
}

export default function EmployeeRepository() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: clockRecords = [] } = useQuery({
    queryKey: ['clock-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.ClockRecord.filter({ date: today });
    },
  });

  const clockedInEmails = new Set(
    clockRecords.filter(r => !r.clock_out).map(r => r.employee_email)
  );

  let filtered = users.filter(u => {
    const term = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    );
  });

  if (filter === 'clocked_in') filtered = filtered.filter(u => clockedInEmails.has(u.email));
  else if (filter === 'admins') filtered = filtered.filter(u => u.role === 'super_admin' || u.role === 'operator');
  else if (filter === 'employees') filtered = filtered.filter(u => u.role === 'employee');

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'clocked_in', label: 'Clocked In' },
    { key: 'admins', label: 'Admins' },
    { key: 'employees', label: 'Employees' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} team members</p>
        </div>
        {user?.role === 'super_admin' && (
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(emp => (
          <EmployeeCard
            key={emp.id}
            emp={emp}
            isClockedIn={clockedInEmails.has(emp.email)}
            onViewProfile={() => navigate(`/employee-profile?id=${emp.id}`)}
            onMessage={() => {}}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
            No employees found
          </div>
        )}
      </div>

      <AddEmployeeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  );
}