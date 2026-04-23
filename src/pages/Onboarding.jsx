import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function Onboarding() {
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setSaving(true);
    try {
      const pinHash = await hashPin(pin);
      await base44.entities.User.update(user.id, {
        full_name: fullName.trim(),
        pin_hash: pinHash,
        has_onboarded: true,
      });

      // Refresh auth context so needsOnboarding clears
      await checkUserAuth();

      setFadeOut(true);
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      console.error('Onboarding save failed:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm';

  return (
    <div
      className={`fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center px-6 transition-opacity duration-400 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo */}
      <div className="mb-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 mx-auto">
          <span className="text-white font-bold text-2xl">W</span>
        </div>
        <h1 className="text-3xl font-bold text-white text-center tracking-tight">WorkGrid</h1>
      </div>

      <p className="text-slate-400 text-center text-sm mt-2 mb-8 max-w-xs">
        Welcome — please set up your account to get started.
      </p>

      <div className="w-full max-w-sm space-y-4">
        {/* Full name */}
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
            Full Name
          </label>
          <input
            className={inputCls}
            type="text"
            placeholder="Jane Smith"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
            Email
          </label>
          <input
            className={`${inputCls} opacity-60 cursor-not-allowed`}
            type="email"
            value={user?.email || ''}
            readOnly
            tabIndex={-1}
          />
        </div>

        {/* PIN */}
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
            Security PIN (4 digits)
          </label>
          <input
            className={inputCls}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="new-password"
          />
        </div>

        {/* Confirm PIN */}
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
            Confirm PIN
          </label>
          <input
            className={inputCls}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <div
          onClick={!saving ? handleSubmit : undefined}
          className={`w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2 ${
            saving
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white cursor-pointer shadow-lg shadow-blue-500/20'
          }`}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Get Started
        </div>
      </div>
    </div>
  );
}
