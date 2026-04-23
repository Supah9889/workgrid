import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, Plus, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MessageBubble from './MessageBubble';
import { format } from 'date-fns';

export default function PrivateChat({ user, markAsRead }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const bottomRef = useRef(null);

  const canCreateConversation = user?.role === 'super_admin' || user?.role === 'operator';

  const loadConversations = async () => {
    const all = await base44.entities.Conversation.list('-last_message_at');
    const visible = user?.role === 'super_admin'
      ? all
      : all.filter(c => (c.participant_emails || []).includes(user?.email));
    setConversations(visible);
  };

  const loadMessages = async (convId) => {
    const msgs = await base44.entities.ChatMessage.filter({ chat_type: 'private', conversation_id: convId }, 'created_date', 100);
    setMessages(msgs);
    markAsRead?.(msgs);
  };

  useEffect(() => {
    loadConversations();
    base44.entities.User.list().then(users =>
      setEmployees(users.filter(u => u.email !== user?.email))
    );
    const unsub = base44.entities.Conversation.subscribe(loadConversations);
    const msgUnsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.chat_type === 'private' && event.data?.conversation_id === activeConvId) {
        loadMessages(activeConvId);
      }
    });
    return () => { unsub(); msgUnsub(); };
  }, []);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending || !activeConvId) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      message_text: text.trim(),
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: user.role || 'employee',
      chat_type: 'private',
      conversation_id: activeConvId,
      read_by: [user.email],
    });
    await base44.entities.Conversation.update(activeConvId, {
      last_message: text.trim().slice(0, 80),
      last_message_at: new Date().toISOString(),
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

  const handleCreateConversation = async () => {
    if (!selectedEmployee) return;
    const emp = employees.find(e => e.email === selectedEmployee);
    const conv = await base44.entities.Conversation.create({
      participant_emails: [user.email, selectedEmployee],
      participant_names: [user.full_name || user.email, emp?.full_name || selectedEmployee],
      created_by: user.email,
      last_message: '',
      last_message_at: new Date().toISOString(),
    });
    await loadConversations();
    setActiveConvId(conv.id);
    setShowNewDialog(false);
    setSelectedEmployee('');
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  const getConvLabel = (conv) => {
    if (!conv.participant_names) return 'Conversation';
    return conv.participant_names.filter(n => n !== (user.full_name || user.email)).join(', ') || conv.participant_names[0];
  };

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-28 flex-shrink-0 border-r border-border flex flex-col bg-muted/30">
        <div className="flex items-center justify-between p-2 border-b border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Chats</span>
          {canCreateConversation && (
            <button onClick={() => setShowNewDialog(true)} className="text-muted-foreground hover:text-foreground">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-[10px] text-center text-muted-foreground mt-4 px-2">No conversations</p>
          )}
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left px-2 py-2.5 border-b border-border transition-colors ${
                activeConvId === conv.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                <span className="text-[11px] font-medium truncate">{getConvLabel(conv)}</span>
              </div>
              {conv.last_message && (
                <p className="text-[10px] text-muted-foreground truncate">{conv.last_message}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center px-4">Select a conversation or start a new one</p>
          </div>
        ) : (
          <>
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold truncate">{activeConv ? getConvLabel(activeConv) : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
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
            <div className="border-t border-border p-2 flex gap-2">
              <input
                className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground min-w-0"
                placeholder="Message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending} className="h-9 w-9 flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* New conversation dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Private Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.email} value={emp.email}>
                    {emp.full_name || emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreateConversation} disabled={!selectedEmployee}>Start Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}