import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useChat(user) {
  const [generalUnread, setGeneralUnread] = useState(0);
  const [privateUnread, setPrivateUnread] = useState(0);

  const totalUnread = generalUnread + privateUnread;

  const loadUnread = useCallback(async () => {
    if (!user?.email) return;

    // Count general messages not read by this user
    const generalMsgs = await base44.entities.ChatMessage.filter({ chat_type: 'general' });
    const unreadGeneral = generalMsgs.filter(
      m => m.sender_email !== user.email && !(m.read_by || []).includes(user.email)
    ).length;
    setGeneralUnread(unreadGeneral);

    // Count private unread only in conversations visible to this user under RLS.
    const conversations = await base44.entities.Conversation.list('-last_message_at');
    let unreadPrivate = 0;
    for (const conv of conversations) {
      const isParticipant = (conv.participant_emails || []).includes(user.email);
      const isAdmin = ['owner', 'super_admin', 'operator'].includes(user.role);
      if (!isParticipant && !isAdmin) continue;
      const msgs = await base44.entities.ChatMessage.filter({
        chat_type: 'private',
        conversation_id: conv.id,
      });
      unreadPrivate += msgs.filter(
        m => m.sender_email !== user.email && !(m.read_by || []).includes(user.email)
      ).length;
    }
    setPrivateUnread(unreadPrivate);
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (!user?.email) return;
    loadUnread();
    const unsubscribe = base44.entities.ChatMessage.subscribe(() => {
      loadUnread();
    });
    return unsubscribe;
  }, [user?.email, loadUnread]);

  const sendMessage = useCallback(async ({ messageText, chatType = 'general', conversationId = null }) => {
    if (!user || !messageText.trim()) return;
    let participantEmails = [];
    if (chatType === 'private' && conversationId) {
      try {
        const conversations = await base44.entities.Conversation.list('-last_message_at');
        const conversation = conversations.find(c => c.id === conversationId);
        participantEmails = conversation?.participant_emails || [user.email];
      } catch {
        participantEmails = [user.email];
      }
    }
    const msg = await base44.entities.ChatMessage.create({
      message_text: messageText.trim(),
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: user.role || 'employee',
      chat_type: chatType,
      conversation_id: conversationId,
      participant_emails: participantEmails,
      read_by: [user.email],
    });
    // If private conversation, update last_message on conversation
    if (conversationId) {
      await base44.entities.Conversation.update(conversationId, {
        last_message: messageText.trim().slice(0, 80),
        last_message_at: new Date().toISOString(),
      });
    }
    return msg;
  }, [user]);

  const markAsRead = useCallback(async (messages) => {
    if (!user?.email) return;
    const unread = messages.filter(
      m => m.sender_email !== user.email && !(m.read_by || []).includes(user.email)
    );
    await Promise.all(
      unread.map(m =>
        base44.entities.ChatMessage.update(m.id, {
          read_by: [...(m.read_by || []), user.email],
        })
      )
    );
  }, [user?.email]);

  return { totalUnread, generalUnread, privateUnread, sendMessage, markAsRead, refreshUnread: loadUnread };
}
