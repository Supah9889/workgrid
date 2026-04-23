import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function GeneralChat({ user, markAsRead }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadMessages = async () => {
    const msgs = await base44.entities.ChatMessage.filter({ chat_type: 'general' }, 'created_date', 100);
    setMessages(msgs);
    markAsRead?.(msgs);
  };

  useEffect(() => {
    loadMessages();
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.chat_type === 'general') {
        loadMessages();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      message_text: text.trim(),
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: user.role || 'employee',
      chat_type: 'general',
      conversation_id: null,
      read_by: [user.email],
    });
    setText('');
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="text-xs text-center text-muted-foreground mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_email === user?.email}
            showSender={msg.sender_email !== user?.email}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-3 flex gap-2">
        <input
          className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending} className="h-9 w-9 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}