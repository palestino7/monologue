import React, { useEffect, useMemo, useRef } from 'react';
import { MessageItem } from './MessageItem';
import type { Message, MediaAttachment, Thread } from '../types';
import { ShieldCheck } from 'lucide-react';

interface ChatViewProps {
  messages: Message[];
  activeThread: Thread;
  isDecrypting: boolean;
  onStarMessage: (id: string, currentStarred: boolean) => void;
  onDeleteMessage: (id: string) => void;
  onOpenMedia: (media: MediaAttachment) => void;
  focusedMessageId?: string | null;
  onFeedback: (message: string) => void;
}

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return messages.reduce<Record<string, Message[]>>((groups, message) => {
    const date = new Date(message.createdAt);
    let label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (date.toDateString() === today.toDateString()) label = 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) label = 'Ontem';
    (groups[label] ??= []).push(message);
    return groups;
  }, {});
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  activeThread,
  isDecrypting,
  onStarMessage,
  onDeleteMessage,
  onOpenMedia,
  focusedMessageId,
  onFeedback,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!focusedMessageId || !messages.some((message) => message.id === focusedMessageId)) return;
    document.getElementById(`message-${focusedMessageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedMessageId, messages]);

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  if (isDecrypting) {
    return (
      <div className="decrypting-state">
        <ShieldCheck className="pulse-glow" size={36} color="var(--conversation-accent)" />
        <span>Descriptografando mensagens...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return <div className="empty-conversation" aria-label={`Conversa ${activeThread.title} vazia`} />;
  }

  return (
    <div className="message-scroll">
      <div className="message-column">
      {Object.entries(groupedMessages).map(([dateLabel, dateMessages]) => (
        <div key={dateLabel}>
          <div className="message-date">
            <span>{dateLabel}</span>
          </div>
          {dateMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onStar={onStarMessage}
              onDelete={onDeleteMessage}
              onOpenMedia={onOpenMedia}
              focused={focusedMessageId === message.id}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
      </div>
    </div>
  );
};
