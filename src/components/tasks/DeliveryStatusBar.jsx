const STEPS = [
  { key: 'pending',   label: 'Assigned'  },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'en_route',  label: 'En Route'  },
  { key: 'delivered', label: 'Delivered' },
];

const NEXT_STATUS = {
  pending:   'picked_up',
  picked_up: 'en_route',
  en_route:  'delivered',
};

const NEXT_LABEL = {
  pending:   'Mark Picked Up',
  picked_up: 'Mark En Route',
  en_route:  'Mark Delivered',
};

export default function DeliveryStatusBar({ status, onAdvance }) {
  const currentIdx = STEPS.findIndex(s => s.key === status);
  const nextStatus = NEXT_STATUS[status];

  return (
    <div className="select-none">
      {/* Step segments */}
      <div className="flex gap-1">
        {STEPS.map((step, i) => {
          const isDone    = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={step.key}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                isDone
                  ? isCurrent && status !== 'delivered'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-blue-500'
                  : 'bg-slate-700/50'
              }`}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1 px-0.5">
        {STEPS.map((step, i) => {
          const isDone    = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <span
              key={step.key}
              className={`text-[9px] font-medium transition-colors ${
                isCurrent ? 'text-blue-400' : isDone ? 'text-blue-500/60' : 'text-slate-600'
              }`}
            >
              {step.label}
            </span>
          );
        })}
      </div>

      {/* Advance button */}
      {onAdvance && nextStatus && (
        <div
          onClick={e => { e.stopPropagation(); onAdvance(nextStatus); }}
          className="mt-2 w-full text-center py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 active:scale-[0.98] text-blue-400 text-xs font-medium cursor-pointer transition-all"
        >
          {NEXT_LABEL[status]}
        </div>
      )}
    </div>
  );
}
