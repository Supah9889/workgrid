import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Hexagon, ChevronLeft, Check, Loader2 } from 'lucide-react';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

function PinDots({ value }) {
  return (
    <div className="flex gap-4 justify-center my-6">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
          value.length > i ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
        }`} />
      ))}
    </div>
  );
}

function NumPad({ value, onChange }) {
  const handle = (k) => {
    if (k === '⌫') onChange(value.slice(0, -1));
    else if (value.length < 4 && k !== '') onChange(value + k);
  };
  return (
    <div className="grid grid-cols-3 gap-3 w-64 mx-auto">
      {NUMPAD.map((k, i) => (
        <button key={i} onClick={() => handle(k)}
          className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
            k === '' ? 'invisible' :
            k === '⌫' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' :
            'bg-slate-700 text-white hover:bg-slate-600'
          }`}>
          {k}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.contact_phone || '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStage, setPinStage] = useState('set');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(true);

  const goNext = () => { setError(''); setStep(s => s + 1); };
  const goBack = () => { setError(''); setStep(s => s - 1); };

  const handlePinChange = (val) => {
    if (pinStage === 'set') {
      setPin(val);
      if (val.length === 4) setTimeout(() => setPinStage('confirm'), 300);
    } else {
      setConfirmPin(val);
    }
  };

  const pinValue = pinStage === 'set' ? pin : confirmPin;
  const pinsMatch = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin;
  const pinMismatch = confirmPin.length === 4 && pin !== confirmPin;

  const handleFinish = async () => {
    if (!pinsMatch) { setError('PINs do not match'); return; }
    setSaving(true);
    try {
      const pinHash = await hashPin(pin);
      const trimmedName = fullName.trim();
      const trimmedPhone = phone.trim();

      await base44.entities.User.update(user.id, {
        full_name: trimmedName,
        contact_phone: trimmedPhone,
        pin_hash: pinHash,
        has_onboarded: true,
      });
      sessionStorage.setItem('onboarding_complete', 'true');
      completeOnboarding({ full_name: trimmedName, contact_phone: trimmedPhone, pin_hash: pinHash });
      setStep(4);
      setTimeout(() => {
        setVisible(false);
        navigate('/');
      }, 1500);
    } catch (e) {
      console.error('[Onboarding] Save failed:', e);
      const msg = e?.message?.toLowerCase().includes('network') || e?.message?.toLowerCase().includes('fetch')
        ? 'Network error — check your connection and try again.'
        : 'Could not save your profile. Please try again.';
      setError(msg);
    }
    setSaving(false);
  };

  return (
    <div className={`min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* Step 1 -- Welcome */}
      {step === 1 && (
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
            <Hexagon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to WorkGrid</h1>
          <p className="text-slate-400 text-lg mb-10">Omi's Parts & Delivery</p>
          <button onClick={goNext}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-4 rounded-2xl text-lg transition-all active:scale-95">
            Get Started
          </button>
        </div>
      )}

      {/* Step 2 -- Your Info */}
      {step === 2 && (
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-white mb-1">Tell us about yourself</h2>
          <p className="text-slate-400 text-sm mb-8">This is how your team will identify you</p>
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wide mb-1.5 block">Full Name *</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Maria Rodriguez"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wide mb-1.5 block">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="e.g. (843) 555-0123"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wide mb-1.5 block">Email</label>
              <input value={user?.email || ''} disabled
                className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-500 rounded-xl px-4 py-3 text-sm cursor-not-allowed" />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex gap-3">
            <button onClick={goBack} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-4 py-3">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => { if (!fullName.trim()) { setError('Please enter your name'); return; } goNext(); }}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all active:scale-95">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3 -- Set PIN */}
      {step === 3 && (
        <div className="w-full max-w-sm flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-1 text-center">
            {pinStage === 'set' ? 'Set your security PIN' : 'Confirm your PIN'}
          </h2>
          <p className="text-slate-400 text-sm mb-2 text-center">
            {pinStage === 'set'
              ? 'Required for clock punches and secure areas'
              : 'Enter your PIN again to confirm'}
          </p>
          <PinDots value={pinValue} />
          {pinMismatch && <p className="text-red-400 text-sm mb-2">PINs do not match</p>}
          {pinsMatch && <p className="text-green-400 text-sm mb-2 flex items-center gap-1"><Check className="w-4 h-4" /> PINs match</p>}
          <NumPad value={pinValue} onChange={handlePinChange} />
          {pinStage === 'confirm' && (
            <button onClick={() => { setConfirmPin(''); setPinStage('set'); setPin(''); }}
              className="text-slate-500 text-sm mt-4 hover:text-slate-300 transition-colors">
              Start over
            </button>
          )}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-6 w-full">
            <button onClick={() => { goBack(); setPin(''); setConfirmPin(''); setPinStage('set'); }}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-4 py-3">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleFinish} disabled={!pinsMatch || saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 -- Success */}
      {step === 4 && (
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            You're all set, {fullName.split(' ')[0]}!
          </h2>
          <p className="text-slate-400">Welcome to the team</p>
        </div>
      )}

      {/* Progress dots */}
      {step < 4 && (
        <div className="flex gap-2 mt-10">
          {[1,2,3].map(i => (
            <div key={i} className={`rounded-full transition-all ${
              i === step ? 'w-6 h-2 bg-blue-500' : 'w-2 h-2 bg-slate-700'
            }`} />
          ))}
        </div>
      )}
    </div>
  );
}