import { useState } from 'react';
import { Delete } from 'lucide-react';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinModal({ title = 'Enter Your PIN', onSuccess, onCancel, expectedHash }) {
  const [digits, setDigits] = useState([]);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  // If no PIN hash exists, block the action and prompt setup
  const noPinSet = expectedHash == null || expectedHash === '';

  const addDigit = async (d) => {
    if (noPinSet || digits.length >= 4 || checking) return;
    const next = [...digits, d];
    setDigits(next);

    if (next.length === 4) {
      setChecking(true);
      const hash = await sha256(next.join(''));
      if (hash === expectedHash) {
        onSuccess();
      } else {
        setError('Incorrect PIN');
        setTimeout(() => {
          setDigits([]);
          setError('');
          setChecking(false);
        }, 1500);
      }
    }
  };

  const removeDigit = () => {
    if (checking) return;
    setDigits(d => d.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-[#0a1628]/97 backdrop-blur-sm flex flex-col items-center justify-center z-50 px-8">
      {/* Logo */}
      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
        <span className="text-white font-bold text-xl">W</span>
      </div>

      <h2 className="text-white text-lg font-semibold mb-1">{noPinSet ? 'PIN Required' : title}</h2>

      <p className={`text-sm mb-6 h-5 transition-colors ${error || noPinSet ? 'text-red-400' : 'text-slate-400'}`}>
        {noPinSet ? 'No PIN set. Complete setup before clocking in.' : error || 'Enter your 4-digit PIN'}
      </p>

      {/* 4-dot display */}
      <div className="flex gap-5 mb-10">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              digits.length > i
                ? error
                  ? 'bg-red-500 border-red-500 scale-110'
                  : 'bg-white border-white scale-110'
                : 'border-slate-600 bg-transparent'
            }`}
          />
        ))}
      </div>

      {noPinSet && (
        <p className="text-xs text-slate-500 mb-4 text-center max-w-xs">
          Go to your profile and complete onboarding to set a PIN before using clock actions.
        </p>
      )}

      {/* Number pad */}
      <div className={`grid grid-cols-3 gap-3 w-64 ${noPinSet ? 'opacity-30 pointer-events-none' : ''}`}>
        {PAD_KEYS.map((key, i) => {
          if (key === '') return <div key={i} />;
          const isBack = key === '⌫';
          return (
            <button
              key={i}
              onClick={() => isBack ? removeDigit() : addDigit(key)}
              disabled={checking && !isBack}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-xl font-semibold transition-all active:scale-95 select-none ${
                isBack
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center'
                  : digits.length >= 4 || checking
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white'
              }`}
            >
              {isBack ? <Delete className="w-5 h-5" /> : key}
            </button>
          );
        })}
      </div>

      <button
        onClick={onCancel}
        disabled={checking}
        className="mt-8 py-3 px-6 text-slate-500 text-sm hover:text-slate-300 transition-colors disabled:opacity-40 rounded-xl hover:bg-slate-800/50"
      >
        Cancel
      </button>
    </div>
  );
}