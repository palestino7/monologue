import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Check,
  Download,
  Eraser,
  Menu,
  MoreVertical,
  Palette,
  Pencil,
  Pin,
  PinOff,
  Search,
  Smile,
  Star,
  Trash2,
  Tags,
  X,
} from 'lucide-react';
import type { Category, Message, PaletteColor, Thread } from '../types';
import { ConversationExportDialog } from './ConversationExportDialog';
import { ThreadVisual } from './ThreadVisual';
import { ActionDialog } from './ActionDialog';
import { getThreadColorName, THREAD_COLORS } from '../constants/threadAppearance';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';
import { useAnimatedClose, useAnimatedVisibility } from '../hooks/useAnimatedVisibility';
import { CategoryPicker } from './CategoryPicker';

const ThreadAppearancePicker = lazy(() => import('./ThreadAppearancePicker').then((module) => ({
  default: module.ThreadAppearancePicker,
})));

interface HeaderProps {
  activeThread: Thread;
  threads: Thread[];
  categories: Category[];
  messages: Message[];
  onToggleSidebar: () => void;
  onOpenGlobalSearch: () => void;
  onUpdateThread: (updates: Partial<Pick<Thread, 'title' | 'category' | 'icon' | 'color' | 'isPinned' | 'isFavorite' | 'isArchived'>>) => void;
  onCreateCategory: (name: string, color: PaletteColor) => Promise<Category>;
  onUpdateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onClearThread: (threadId: string) => Promise<void>;
  onDeleteThread: (threadId: string) => void;
  onFeedback: (message: string) => void;
}

export function Header({
  activeThread,
  threads,
  categories,
  messages,
  onToggleSidebar,
  onOpenGlobalSearch,
  onUpdateThread,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onClearThread,
  onDeleteThread,
  onFeedback,
}: HeaderProps) {
  const [showColors, setShowColors] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<'clear' | 'delete' | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [showRename, setShowRename] = useState(false);
  const [menuEditor, setMenuEditor] = useState<'icon' | 'category' | null>(null);
  const iconEditorRef = useRef<HTMLDivElement | null>(null);
  const menuEditorRef = useRef<HTMLDivElement | null>(null);
  const threadMenuRef = useRef<HTMLDivElement | null>(null);
  const menuLayer = useAnimatedVisibility();
  const appearanceLayer = useAnimatedVisibility();
  const { visible: showMenu, closing: closingMenu, open: openMenu, close: closeMenuLayer, reset: resetMenu } = menuLayer;
  const { visible: showAppearance, closing: closingAppearance, toggle: toggleAppearance, close: closeAppearance, reset: resetAppearance } = appearanceLayer;
  const clearMenuEditor = useCallback(() => setMenuEditor(null), []);
  const { closing: closingMenuEditor, close: closeMenuEditor } = useAnimatedClose(clearMenuEditor);
  const activeCategoryColor = categories.find((category) => category.name === activeThread.category)?.color;

  const closeMenu = useCallback(() => {
    closeMenuLayer();
    setShowColors(false);
  }, [closeMenuLayer]);

  useDismissibleLayer(showMenu, threadMenuRef, closeMenu);
  useDismissibleLayer(showAppearance, iconEditorRef, closeAppearance);
  useDismissibleLayer(Boolean(menuEditor), menuEditorRef, closeMenuEditor);

  useEffect(() => {
    resetMenu();
    resetAppearance();
    setShowColors(false);
    setPendingConfirmation(null);
    setShowRename(false);
    setMenuEditor(null);
  }, [activeThread.id, resetAppearance, resetMenu]);

  const beginRename = () => {
    setRenameDraft(activeThread.title);
    setShowRename(true);
    closeMenu();
  };

  const saveRename = () => {
    const title = renameDraft.trim();
    if (title && title !== activeThread.title) onUpdateThread({ title });
    setShowRename(false);
  };

  return (
    <>
      <header className="chat-header" aria-label="Ações da conversa">
        <button className="icon-button menu-toggle" onClick={onToggleSidebar} aria-label="Abrir menu"><Menu size={21} /></button>

        <div className="mobile-thread-identity">
          <div className="mobile-thread-icon-editor" ref={iconEditorRef}>
            <button className="mobile-thread-icon" onClick={() => { toggleAppearance(); closeMenu(); }} aria-label="Alterar emoji">
              <ThreadVisual value={activeThread.icon} size="header" />
            </button>
            {showAppearance && (
              <Suspense fallback={<div className="appearance-popover appearance-loading">Carregando emojis…</div>}>
                <ThreadAppearancePicker closing={closingAppearance} onChange={(icon) => { onUpdateThread({ icon }); closeAppearance(); }} />
              </Suspense>
            )}
          </div>
          <div className="mobile-thread-copy">
            <strong className="mobile-thread-title">{activeThread.title}</strong>
            {activeThread.category !== 'Geral' && (
              <span
                className="mobile-thread-category"
                style={activeCategoryColor ? {
                  backgroundColor: `color-mix(in srgb, ${activeCategoryColor} 14%, transparent)`,
                  borderColor: `color-mix(in srgb, ${activeCategoryColor} 34%, transparent)`,
                } : undefined}
              >
                <span>{activeThread.category}</span>
              </span>
            )}
          </div>
        </div>

        <div className="header-actions">
          <button className="icon-button" onClick={() => {
            onOpenGlobalSearch();
            closeMenu();
            closeAppearance();
          }} aria-label="Buscar em todas as conversas"><Search size={19} /></button>

          <div className="thread-menu-wrap" ref={threadMenuRef}>
            <button className="icon-button" onClick={() => {
              if (showMenu) closeMenu();
              else openMenu();
              closeAppearance();
            }} aria-label="Opções da conversa"><MoreVertical size={19} /></button>
            {showMenu && (
              <div className={`thread-menu menu-surface ${closingMenu ? 'animate-menu-close' : 'animate-menu-pop'}`} role="menu" aria-label="Opções da conversa">
                <button className="menu-item" role="menuitem" onClick={beginRename}><Pencil size={16} />Mudar nome</button>
                <button className="menu-item" role="menuitem" onClick={() => { closeMenu(); setMenuEditor('category'); }}><Tags size={16} />Mudar categoria</button>
                <button className="menu-item" role="menuitem" onClick={() => { closeMenu(); setMenuEditor('icon'); }}><Smile size={16} />Mudar ícone</button>
                <button className="menu-item" role="menuitem" onClick={() => onUpdateThread({ isPinned: !activeThread.isPinned })}>{activeThread.isPinned ? <PinOff size={16} /> : <Pin size={16} />}{activeThread.isPinned ? 'Desafixar conversa' : 'Fixar conversa'}</button>
                <button className="menu-item" role="menuitem" onClick={() => onUpdateThread({ isFavorite: !activeThread.isFavorite })}><Star size={16} fill={activeThread.isFavorite ? 'currentColor' : 'none'} />{activeThread.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorita'}</button>
                <button className="menu-item" role="menuitem" onClick={() => setShowColors(!showColors)}><Palette size={16} />Cor da conversa</button>
                {showColors && (
                  <div className="thread-color-panel">
                    <div className="color-picker-grid">
                      {THREAD_COLORS.map((color) => (
                        <button
                          key={color}
                          className={activeThread.color === color ? 'selected' : ''}
                          style={{ backgroundColor: color }}
                          onClick={() => onUpdateThread({ color })}
                          aria-label={`Usar ${getThreadColorName(color)}`}
                          title={getThreadColorName(color)}
                        >
                          {activeThread.color === color && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                    <button className="thread-color-reset" onClick={() => onUpdateThread({ color: 'neutral' })}>
                      <X size={13} />Sem cor
                    </button>
                  </div>
                )}
                <button className="menu-item" role="menuitem" onClick={() => { closeMenu(); setShowExport(true); }}><Download size={16} />Exportar conversa</button>
                <button className="menu-item" role="menuitem" onClick={() => onUpdateThread({ isArchived: !activeThread.isArchived })}>{activeThread.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}{activeThread.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}</button>
                <div className="thread-menu-separator" />
                <button className="menu-item" role="menuitem" onClick={() => { closeMenu(); setPendingConfirmation('clear'); }}><Eraser size={16} />Limpar conversa</button>
                <button className="menu-item danger" role="menuitem" onClick={() => { closeMenu(); setPendingConfirmation('delete'); }}><Trash2 size={16} />Excluir conversa</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {menuEditor && (
        <div className={`header-identity-layer ${closingMenuEditor ? 'animate-menu-close' : 'animate-menu-pop'}`} ref={menuEditorRef}>
          {menuEditor === 'icon' ? (
            <Suspense fallback={<div className="sidebar-editor-loading">Carregando emojis…</div>}>
              <ThreadAppearancePicker onChange={(icon) => { onUpdateThread({ icon }); closeMenuEditor(); }} />
            </Suspense>
          ) : (
            <CategoryPicker
              activeCategory={activeThread.category}
              categories={categories}
              threads={threads}
              onSelect={(category) => { onUpdateThread({ category }); closeMenuEditor(); }}
              onCreate={onCreateCategory}
              onUpdate={onUpdateCategory}
              onDelete={onDeleteCategory}
            />
          )}
        </div>
      )}
      {showRename && (
        <ActionDialog
          title="Mudar nome da conversa"
          description="Use um nome curto que ajude você a encontrá-la depois."
          confirmLabel="Salvar nome"
          confirmDisabled={!renameDraft.trim()}
          onConfirm={saveRename}
          onClose={() => setShowRename(false)}
        >
          <input
            className="action-dialog-input"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && renameDraft.trim()) saveRename(); }}
            autoFocus
            data-dialog-initial-focus
            aria-label="Novo nome da conversa"
          />
        </ActionDialog>
      )}
      {showExport && <ConversationExportDialog thread={activeThread} messages={messages} onClose={() => setShowExport(false)} onExported={() => onFeedback('Conversa exportada.')} />}
      {pendingConfirmation === 'clear' && (
        <ActionDialog
          title="Limpar conversa?"
          description={`Todas as mensagens de “${activeThread.title}” serão removidas, mas a conversa continuará existindo.`}
          confirmLabel="Limpar mensagens"
          destructive
          onConfirm={async () => { await onClearThread(activeThread.id); setPendingConfirmation(null); }}
          onClose={() => setPendingConfirmation(null)}
        />
      )}
      {pendingConfirmation === 'delete' && (
        <ActionDialog
          title="Excluir conversa?"
          description={`“${activeThread.title}” e todas as suas mensagens serão removidas permanentemente.`}
          confirmLabel="Excluir conversa"
          destructive
          onConfirm={() => { onDeleteThread(activeThread.id); setPendingConfirmation(null); }}
          onClose={() => setPendingConfirmation(null)}
        />
      )}
    </>
  );
}
