import { format } from 'date-fns';

export default function MessageBubble({ message, isOwn, showSender = true }) {
  const initials = (message.sender_name || message.sender_email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const time = message.created_date
    ? format(new Date(message.created_date), 'h:mm a')
    : '';

  return (
    <div className={`flex gap-2 items-end mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mb-4">
          {initials}
        </div>
      )}

      <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {showSender && !isOwn && (
          <span className="text-[10px] text-muted-foreground mb-1 px-1">{message.sender_name}</span>
        )}
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}>
          {message.message_text}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 px-1">{time}</span>
      </div>
    </div>
  );
}