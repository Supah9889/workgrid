import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

const CONFIRMATION_TEXT = 'I understand this will remove my WorkGrid profile access.';

export default function DeleteAccount() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequestDeletion = async () => {
    if (!confirmed || submitting || !user?.profile_id) return;
    setSubmitting(true);
    const timestamp = new Date().toISOString();

    try {
      await base44.entities.EmployeeProfile.update(user.profile_id, {
        email: user.email,
        status: 'inactive',
        pin_hash: '',
        has_onboarded: false,
        deletion_requested: true,
        deletion_requested_at: timestamp,
        deletion_request_note: 'User requested WorkGrid profile deletion. Business records may be retained as required.',
      });

      try {
        await base44.entities.ActivityFeed.create({
          event_type: 'account_deletion_requested',
          description: `${user.full_name || user.email} requested WorkGrid profile deletion`,
          actor_email: user.email,
          actor_name: user.full_name || user.email,
          entity_id: user.profile_id,
          entity_type: 'EmployeeProfile',
          metadata: {
            action: 'account_deletion_requested',
            employee_email: user.email,
            timestamp,
          },
        });
      } catch (error) {
        console.warn('[DeleteAccount] ActivityFeed log failed:', error);
      }

      setRequested(true);
      toast({
        title: 'Deletion request submitted',
        description: 'Your WorkGrid profile access has been disabled.',
      });
      setTimeout(() => logout(), 1800);
    } catch (error) {
      console.error('[DeleteAccount] Request failed:', error);
      toast({
        title: 'Something went wrong',
        description: "We couldn't submit the request. Please try again or contact an admin.",
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delete Account</h1>
          <p className="text-sm text-muted-foreground">Request removal of your WorkGrid profile data.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">What this does</p>
            <p className="text-sm">
              This disables your WorkGrid profile access, clears your PIN hash, and sends an account deletion request to the owner/admin team.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            WorkGrid does not show or store your raw PIN. We only store a secure PIN hash, and this request clears that hash.
          </p>
          <p>
            Base44 login/auth accounts are not deleted directly from this page. If auth deletion is needed, an owner/admin must complete that safely in Base44.
          </p>
          <p>
            Clock records, task history, audit logs, and payroll-related records may be retained for business or legal recordkeeping.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm font-medium">{CONFIRMATION_TEXT}</span>
        </label>

        {requested ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
            Your request was submitted. You will be signed out now.
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={!confirmed || submitting || !user?.profile_id}
              className="h-11"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Request Account Deletion
            </Button>
            <Button type="button" variant="outline" onClick={() => window.history.back()} className="h-11">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
