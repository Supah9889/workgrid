import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getEmployeeProfileByEmail } from '@/lib/employeeProfiles';
import { Hexagon } from 'lucide-react';

async function verifyPin(enteredPin, storedHash) {
  const encoder = new TextEncoder();
  const data = encoder.encode(enteredPin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return hash === storedHash;
}

const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const MAX_ATTEMPTS = 5;

function PinDots({ value, error }) {
  return (
    <div className="flex gap-4 justify-center my-6">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
          error ? 'bg-red-500 border-red-500' :
          value.length > i ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
        }`} />
      ))}
    </div>
  );
}

function NumPad({ value, onChange, disabled }) {
  const handle = (k) => {
    if (disabled) return;
    if (k === '⌫') onChange(value.slice(0, -1));
    else if (value.length < 4 && k !== '') onChange(value + k);
  };
  return (
    <div className="grid grid-cols-3 gap-3 w-64 mx-auto">
      {NUMPAD.map((k, i) => (
        <button key={i} onClick={() => handle(k)} disabled={disabled}
          className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
            k === '' ? 'invisible' :
            disabled ? 'bg-slate-800 text-slate-600 cursor-not-allowed' :
            k === '⌫' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' :
            'bg-slate-700 text-white hover:bg-slate-600'
          }`}>
          {k}
        </button>
      ))}
    </div>
  );
}

export default function PinLogin() {
  const { user, logout, reloadCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const locked = attempts >= MAX_ATTEMPTS;

  const initials = (user?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleChange = async (val) => {
    if (locked || checking) return;
    setPin(val);

    if (val.length === 4) {
      setChecking(true);
      const profile = await getEmployeeProfileByEmail(user?.email, { allowLegacyFallback: true });
      if (!profile?.pin_hash) {
        console.error('[PinLogin] PIN missing', { email: user?.email });
        setError('PIN setup is missing. Please contact your manager.');
        setChecking(false);
        return;
      }
      const ok = await verifyPin(val, profile.pin_hash);

      if (ok) {
        sessionStorage.setItem('pin_verified', 'true');
        sessionStorage.setItem('pin_verified_email', profile.email);
        let freshUser = null;
        try {
          freshUser = await reloadCurrentUser();
        } catch (error) {
          console.warn('[PinLogin] Profile reload after PIN verification failed:', error);
        }
        const role = freshUser?.role || profile?.role || user?.role || 'employee';
        console.info('[PinLogin] PIN verified; routing by role.', {
          email: profile.email,
          profile_id: profile.id || null,
          role,
          status: profile.status || null,
          _profileSource: profile._profileSource || null,
        });
        const dest = (role === 'super_admin' || role === 'owner' || role === 'operator')
          ? '/dashboard' : '/my-tasks';
        navigate(dest, { replace: true });
      } else {
        console.error('[PinLogin] PIN mismatch', { email: user?.email });
        const next = attempts + 1;
        setAttempts(next);
        if (next < MAX_ATTEMPTS) setError('Incorrect PIN');
        setTimeout(() => {
          setPin('');
          setError('');
          setChecking(false);
        }, 1500);
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 animate-in fade-in duration-200"
      onTouchMove={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30">
        <Hexagon className="w-7 h-7 text-white" />
      </div>

      <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-3">
        <span className="text-white text-xl font-bold">{initials}</span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">
        Welcome back, {user?.full_name?.split(' ')[0] || 'there'}
      </h1>
      <p className="text-slate-400 text-sm mb-2">Enter your PIN to continue</p>

      <PinDots value={pin} error={!!error} />

      <div className="h-5 mb-2 flex items-center justify-center">
        {locked ? (
          <div className="text-center">
            <p className="text-red-400 text-sm font-semibold">Too many attempts. Please contact your manager.</p>
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : null}
      </div>

      <NumPad value={pin} onChange={handleChange} disabled={locked || checking} />

      <button
        onClick={() => logout()}
        className="mt-8 text-slate-500 text-sm hover:text-slate-300 transition-colors py-2 px-4"
      >
        Not you? Sign out
      </button>
    </div>
  );
}
