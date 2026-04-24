import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Phone, Mail, Shield, Loader2, X, Check } from 'lucide-react';

const ROLE_LABELS = { super_admin: 'Admin', operator: 'Operator', employee: 'Employee' };
const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  operator: 'bg-blue-100 text-blue-700',
  employee: 'bg-slate-100 text-slate-600',
};

function ContactCard({ person, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(person.contact_phone || '');
  const [email, setEmail] = useState(person.contact_email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(person.id, { contact_phone: phone, contact_email: email });
      setEditing(false);
    } catch {
      // Error toast is handled in parent onSave
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPhone(person.contact_phone || '');
    setEmail(person.contact_email || '');
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
        {(person.full_name || person.email || '?')[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm">{person.full_name || person.email}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[person.role] || ROLE_COLORS.employee}`}>
            {ROLE_LABELS[person.role] || person.role}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{person.email}</p>

        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Contact phone for alerts"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Alert email (leave blank to use login email)"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 text-xs gap-1">
                <X className="w-3 h-3" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {person.contact_phone || <span className="italic">No phone</span>}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {person.contact_email || <span className="italic">Uses login email</span>}
            </span>
          </div>
        )}
      </div>

      {/* Edit button */}
      {canEdit && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="p-3 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function ContactDirectory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const isAdmin = user?.role === 'super_admin' || user?.role === 'operator';

  const { data: allUsers = [], isLoading, isError } = useQuery({
    queryKey: ['contact-directory-users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Employees see only themselves; admins see all active users
  const visible = isAdmin
    ? allUsers.filter(u => u.status !== 'inactive')
    : allUsers.filter(u => u.email === user?.email);

  const filtered = visible.filter(u =>
    !search ||
    `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: admins first, then operators, then employees
  const sorted = [...filtered].sort((a, b) => {
    const order = { super_admin: 0, operator: 1, employee: 2 };
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  const handleSave = async (entityId, updates) => {
    try {
      await base44.entities.User.update(entityId, updates);
      queryClient.invalidateQueries({ queryKey: ['contact-directory-users'] });
      toast({ title: 'Contact info updated' });
    } catch (err) {
      console.error('[ContactDirectory] Save failed:', err);
      const description = err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch')
        ? 'Network error — check your connection and try again.'
        : (err.message || 'Your contact info could not be saved. Please try again.');
      toast({ title: 'Failed to save contact info', description, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact Directory</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isAdmin ? 'Manage contact information for alerts and notifications.' : 'Your contact information for alerts.'}
        </p>
      </div>

      {isAdmin && (
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      {isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-destructive font-medium">Failed to load data</p>
          <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No users found</div>
          ) : (
            sorted.map(person => (
              <ContactCard
                key={person.id}
                person={person}
                canEdit={isAdmin || person.email === user?.email}
                onSave={handleSave}
              />
            ))
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/40">
          <Shield className="w-3.5 h-3.5" />
          Admins and operators with contact info on file will receive out-of-bounds punch alerts.
        </div>
      )}
    </div>
  );
}