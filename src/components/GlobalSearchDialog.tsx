import { Search, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Message, Thread } from '../types';
import { useAnimatedClose } from '../hooks/useAnimatedVisibility';
import { useEscapeDismiss } from '../hooks/useEscapeDismiss';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { ThreadVisual } from './ThreadVisual';

type SearchSection = 'search' | 'favorites';

interface GlobalSearchDialogProps {
  threads: Thread[];
  loadMessages: () => Promise<Message[]>;
  onSelect: (threadId: string, messageId?: string) => void;
  onClose: () => void;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function excerpt(content: string, query: string) {
  if (!content) return 'Mensagem com mídia';
  const normalizedContent = normalize(content);
  const index = normalizedContent.indexOf(normalize(query));
  const start = Math.max(0, index > -1 ? index - 38 : 0);
  const prefix = start > 0 ? '…' : '';
  const text = content.slice(start, start + 116).replace(/\s+/g, ' ').trim();
  return `${prefix}${text}${content.length > start + 116 ? '…' : ''}`;
}

export function GlobalSearchDialog({ threads, loadMessages, onSelect, onClose }: GlobalSearchDialogProps) {
  const [section, setSection] = useState<SearchSection>('search');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { closing, close } = useAnimatedClose(onClose);
  const dialogRef = useDialogFocus<HTMLElement>();

  useEffect(() => {
    let active = true;
    void loadMessages().then((loaded) => {
      if (active) setMessages(loaded);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadMessages]);

  useEscapeDismiss(close);

  const threadById = useMemo(() => new Map(threads.map((thread) => [thread.id, thread])), [threads]);
  const normalizedQuery = normalize(query.trim());
  const conversationResults = useMemo(() => {
    if (section !== 'search' || !normalizedQuery) return [];
    return threads.filter((thread) => normalize(`${thread.title} ${thread.category}`).includes(normalizedQuery));
  }, [normalizedQuery, section, threads]);
  const messageResults = useMemo(() => {
    if (section === 'favorites') return messages.filter((message) => message.isStarred);
    if (!normalizedQuery) return [];
    return messages.filter((message) => normalize(message.content).includes(normalizedQuery));
  }, [messages, normalizedQuery, section]);

  const selectResult = (threadId: string, messageId?: string) => {
    onSelect(threadId, messageId);
    close();
  };

  return createPortal(
    <div className={`global-search-backdrop ${closing ? 'animate-overlay-close' : 'animate-overlay-open'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialogRef} className={`global-search-dialog ${closing ? 'animate-dialog-close' : 'animate-dialog-open'}`} role="dialog" aria-modal="true" aria-label="Busca global" tabIndex={-1}>
        <header className="global-search-header">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSection('search'); }}
            placeholder="Buscar em todas as conversas"
            aria-label="Buscar em todas as conversas"
            autoFocus
            data-dialog-initial-focus
          />
          <button onClick={close} aria-label="Fechar busca"><X size={18} /></button>
        </header>

        <nav className="global-search-tabs" aria-label="Conteúdo da busca">
          <button className={section === 'search' ? 'active' : ''} onClick={() => setSection('search')}><Search size={15} />Buscar</button>
          <button className={section === 'favorites' ? 'active' : ''} onClick={() => setSection('favorites')}><Star size={15} />Mensagens favoritas</button>
        </nav>

        <div className="global-search-results">
          {loading ? (
            <div className="global-search-empty">Preparando suas conversas…</div>
          ) : section === 'search' && !normalizedQuery ? (
            <div className="global-search-empty"><Search size={24} /><strong>Encontre qualquer pensamento</strong><span>Busque pelo texto, nome da conversa ou categoria.</span></div>
          ) : conversationResults.length === 0 && messageResults.length === 0 ? (
            <div className="global-search-empty"><strong>{section === 'favorites' ? 'Nenhuma mensagem favorita' : 'Nada encontrado'}</strong><span>{section === 'favorites' ? 'Favorite uma mensagem para encontrá-la rapidamente aqui.' : 'Tente buscar usando outras palavras.'}</span></div>
          ) : (
            <>
              {conversationResults.length > 0 && <div className="global-search-group-label">Conversas</div>}
              {conversationResults.map((thread) => (
                <button className="global-search-result" key={thread.id} onClick={() => selectResult(thread.id)}>
                  <span className="global-search-result-icon"><ThreadVisual value={thread.icon} /></span>
                  <span><strong>{thread.title}</strong><small>{thread.category}</small></span>
                </button>
              ))}
              {messageResults.length > 0 && <div className="global-search-group-label">{section === 'favorites' ? 'Favoritas' : 'Mensagens'}</div>}
              {messageResults.map((message) => {
                const thread = threadById.get(message.threadId);
                if (!thread) return null;
                return (
                  <button className="global-search-result global-search-result--message" key={message.id} onClick={() => selectResult(thread.id, message.id)}>
                    <span className="global-search-result-icon"><ThreadVisual value={thread.icon} /></span>
                    <span><strong>{thread.title}</strong><small>{excerpt(message.content, normalizedQuery)}</small></span>
                    <time>{new Date(message.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</time>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
