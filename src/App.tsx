import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { LocalEncryptionProvider } from './context/LocalEncryptionProvider';
import { useLocalEncryption } from './context/localEncryption';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { Sidebar, type ConversationFilter } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { MediaLightbox } from './components/MediaLightbox';
import { BrandLogo } from './components/BrandLogo';
import { GlobalSearchDialog } from './components/GlobalSearchDialog';
import { Toast, type ToastData } from './components/Toast';
import type { MediaAttachment } from './types';
import { useAnimatedVisibility } from './hooks/useAnimatedVisibility';
import './styles/theme.css';

const ACTIVE_FILTER_STORAGE_KEY = 'monologue.active-filter';
const SETTINGS_OPEN_STORAGE_KEY = 'monologue.settings-open';

function readStoredFilter(): ConversationFilter {
  try {
    const storedFilter = localStorage.getItem(ACTIVE_FILTER_STORAGE_KEY);
    if (
      storedFilter === 'all'
      || storedFilter === 'favorites'
      || storedFilter === 'archived'
      || storedFilter?.startsWith('category:')
    ) {
      return storedFilter as ConversationFilter;
    }
  } catch {
    // Usa o filtro padrão quando o armazenamento do navegador está indisponível.
  }
  return 'all';
}

function readStoredSettingsVisibility() {
  try {
    return localStorage.getItem(SETTINGS_OPEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function MainApp() {
  const { isInitializing } = useLocalEncryption();
  const {
    threads,
    categories,
    activeThread,
    activeThreadId,
    setActiveThreadId,
    messages,
    allMessages,
    isDecrypting,
    sendMessage,
    toggleStarMessage,
    deleteMessage,
    restoreMessage,
    getAllSearchMessages,
    createQuickThread,
    updateThread,
    clearThread,
    clearAllData,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteThread,
  } = useChat();

  useTheme();

  const [activeFilter, setActiveFilter] = useState<ConversationFilter>(readStoredFilter);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(readStoredSettingsVisibility);
  const [activeMediaLightbox, setActiveMediaLightbox] = useState<MediaAttachment | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const sidebarLayer = useAnimatedVisibility();
  const { visible: sidebarOpen, closing: sidebarClosing, close: closeSidebar } = sidebarLayer;

  const showToast = useCallback((message: string, action?: Pick<ToastData, 'actionLabel' | 'onAction'>) => {
    setToast({ id: Date.now(), message, ...action });
  }, []);

  const createConversation = useCallback(() => {
    setActiveFilter('all');
    void createQuickThread();
  }, [createQuickThread]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [closeSidebar, sidebarOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_FILTER_STORAGE_KEY, activeFilter);
    } catch {
      // O filtro permanece funcional durante a sessão atual.
    }
  }, [activeFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_OPEN_STORAGE_KEY, String(isSettingsModalOpen));
    } catch {
      // A tela de configurações permanece funcional durante a sessão atual.
    }
  }, [isSettingsModalOpen]);

  useEffect(() => {
    if (!focusedMessageId) return;
    const timer = window.setTimeout(() => setFocusedMessageId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [focusedMessageId]);

  const visibleThreads = useMemo(() => {
    if (activeFilter === 'archived') return threads.filter((thread) => thread.isArchived);
    const available = threads.filter((thread) => !thread.isArchived);
    if (activeFilter === 'favorites') return available.filter((thread) => thread.isFavorite);
    if (activeFilter.startsWith('category:')) {
      const category = categories.find((item) => `category:${item.id}` === activeFilter);
      return available.filter((thread) => thread.category === category?.name);
    }
    return available;
  }, [activeFilter, categories, threads]);

  useEffect(() => {
    if (
      activeFilter.startsWith('category:')
      && categories.length
      && !categories.some((category) => `category:${category.id}` === activeFilter)
    ) {
      setActiveFilter('all');
    }
  }, [activeFilter, categories]);

  useEffect(() => {
    if (visibleThreads.length && !visibleThreads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(visibleThreads[0].id);
    }
  }, [activeFilter, activeThreadId, setActiveThreadId, visibleThreads]);

  const displayedActiveThread = visibleThreads.find((thread) => thread.id === activeThreadId);

  const handleClearAllData = async () => {
    await clearAllData();
    setActiveFilter('all');
    setFocusedMessageId(null);
    setActiveMediaLightbox(null);
    setIsGlobalSearchOpen(false);
  };

  const selectSearchResult = (threadId: string, messageId?: string) => {
    const thread = threads.find((item) => item.id === threadId);
    setActiveFilter(thread?.isArchived ? 'archived' : 'all');
    setActiveThreadId(threadId);
    setFocusedMessageId(messageId ?? null);
  };

  const handleToggleStarMessage = async (messageId: string, currentStarred: boolean) => {
    await toggleStarMessage(messageId, currentStarred);
    showToast(currentStarred ? 'Mensagem removida das favoritas.' : 'Mensagem adicionada às favoritas.', {
      actionLabel: 'Desfazer',
      onAction: () => toggleStarMessage(messageId, !currentStarred),
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    const deleted = await deleteMessage(messageId);
    if (!deleted) return;
    showToast('Mensagem excluída.', {
      actionLabel: 'Desfazer',
      onAction: () => restoreMessage(deleted),
    });
  };

  const handleUpdateThread = async (
    id: string,
    updates: Parameters<typeof updateThread>[1],
  ) => {
    await updateThread(id, updates);
    if (updates.isArchived !== undefined) {
      showToast(updates.isArchived ? 'Conversa arquivada.' : 'Conversa desarquivada.', {
        actionLabel: 'Desfazer',
        onAction: () => updateThread(id, { isArchived: !updates.isArchived }),
      });
    } else if (updates.isPinned !== undefined) {
      showToast(updates.isPinned ? 'Conversa fixada.' : 'Conversa desafixada.', {
        actionLabel: 'Desfazer',
        onAction: () => updateThread(id, { isPinned: !updates.isPinned }),
      });
    } else if (updates.isFavorite !== undefined) {
      showToast(updates.isFavorite ? 'Conversa adicionada às favoritas.' : 'Conversa removida das favoritas.', {
        actionLabel: 'Desfazer',
        onAction: () => updateThread(id, { isFavorite: !updates.isFavorite }),
      });
    } else if (updates.title !== undefined) showToast('Nome da conversa atualizado.');
    else if (updates.category !== undefined) showToast('Categoria alterada.');
    else if (updates.icon !== undefined) showToast('Ícone atualizado.');
    else if (updates.color !== undefined) showToast('Cor da conversa alterada.');
  };

  const handleClearThread = async (id: string) => {
    await clearThread(id);
    showToast('Conversa limpa.');
  };

  const handleDeleteThread = async (id: string) => {
    await deleteThread(id);
    showToast('Conversa excluída.');
  };

  if (isInitializing) {
    return (
      <div className="app-loading">
        <div>
          <BrandLogo />
          <p>Preparando seu espaço...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        threads={visibleThreads}
        allThreads={threads}
        categories={categories}
        activeFilter={activeFilter}
        activeThreadId={activeThreadId}
        onSelectThread={(id) => {
          setFocusedMessageId(null);
          setActiveThreadId(id);
        }}
        onUpdateThread={(id, updates) => { void handleUpdateThread(id, updates); }}
        onDeleteThread={(id) => { void handleDeleteThread(id); }}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onChangeFilter={setActiveFilter}
        onCreateNewThread={createConversation}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isOpen={sidebarOpen && !sidebarClosing}
        onCloseMobile={closeSidebar}
      />

      {sidebarOpen && (
        <button className={`sidebar-scrim ${sidebarClosing ? 'animate-overlay-close' : 'animate-overlay-open'}`} aria-label="Fechar menu" onClick={closeSidebar} />
      )}

      <main
        className="workspace"
        style={{ '--conversation-accent': activeThread?.color === 'neutral' ? 'var(--color-neutral-accent)' : activeThread?.color || 'var(--color-neutral-accent)' } as CSSProperties}
      >
        {threads.length > 0 && displayedActiveThread && activeThread && (
          <Header
            activeThread={activeThread}
            threads={threads}
            categories={categories}
            messages={allMessages}
            onToggleSidebar={sidebarLayer.toggle}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            onUpdateThread={(updates) => { void handleUpdateThread(activeThread.id, updates); }}
            onCreateCategory={createCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onClearThread={handleClearThread}
            onDeleteThread={(id) => { void handleDeleteThread(id); }}
            onFeedback={showToast}
          />
        )}

        {threads.length === 0 ? (
          <div className="global-empty-state">
            <BrandLogo markOnly />
            <h1><span>Comece por onde</span><span>a mente estiver.</span></h1>
            <p>Não precisa escrever bonito, só coloque seus pensamentos aqui.</p>
            <button onClick={createConversation}><Plus size={18} />Criar nova conversa</button>
          </div>
        ) : displayedActiveThread && activeThread ? (
          <>
            <ChatView
              messages={messages}
              activeThread={activeThread}
              isDecrypting={isDecrypting}
              onStarMessage={handleToggleStarMessage}
              onDeleteMessage={(id) => { void handleDeleteMessage(id); }}
              onOpenMedia={setActiveMediaLightbox}
              focusedMessageId={focusedMessageId}
              onFeedback={showToast}
            />

            <ChatInput onSendMessage={sendMessage} />
          </>
        ) : (
          <div className="filter-empty-state"><strong>Nenhuma conversa aqui</strong><span>Escolha outro filtro ou crie uma nova conversa.</span><button onClick={() => setActiveFilter('all')}>Ver todas as conversas</button></div>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onClearAllData={handleClearAllData}
      />

      <MediaLightbox
        media={activeMediaLightbox}
        onClose={() => setActiveMediaLightbox(null)}
      />

      {isGlobalSearchOpen && (
        <GlobalSearchDialog
          threads={threads}
          loadMessages={getAllSearchMessages}
          onSelect={selectSearchResult}
          onClose={() => setIsGlobalSearchOpen(false)}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <LocalEncryptionProvider>
      <MainApp />
    </LocalEncryptionProvider>
  );
}
