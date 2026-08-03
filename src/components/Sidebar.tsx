import { Archive, ArchiveRestore, Check, ChevronDown, MoreVertical, Pencil, Plus, Settings, Star, Tags, Trash2, X } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, PaletteColor, Thread } from '../types';
import { BrandLogo } from './BrandLogo';
import { CategoryPicker } from './CategoryPicker';
import { ThreadVisual } from './ThreadVisual';
import { useAnimatedClose, useAnimatedVisibility } from '../hooks/useAnimatedVisibility';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';
import { ActionDialog } from './ActionDialog';
import { CategoryDeleteDialog } from './CategoryDeleteDialog';

const ThreadAppearancePicker = lazy(() => import('./ThreadAppearancePicker').then((module) => ({
  default: module.ThreadAppearancePicker,
})));

export type ConversationFilter = 'all' | 'favorites' | 'archived' | `category:${string}`;

interface SidebarProps {
  threads: Thread[];
  allThreads: Thread[];
  categories: Category[];
  activeFilter: ConversationFilter;
  activeThreadId: string;
  onChangeFilter: (filter: ConversationFilter) => void;
  onSelectThread: (id: string) => void;
  onUpdateThread: (id: string, updates: Partial<Pick<Thread, 'title' | 'category' | 'icon' | 'isPinned' | 'isFavorite' | 'isArchived'>>) => void;
  onDeleteThread: (id: string) => void;
  onCreateCategory: (name: string, color: PaletteColor) => Promise<Category>;
  onUpdateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onCreateNewThread: () => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  threads,
  allThreads,
  categories,
  activeFilter,
  activeThreadId,
  onChangeFilter,
  onSelectThread,
  onUpdateThread,
  onDeleteThread,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateNewThread,
  onOpenSettings,
  isOpen,
  onCloseMobile,
}: SidebarProps) {
  const filterRef = useRef<HTMLDivElement | null>(null);
  const categoryActionMenuRef = useRef<HTMLDivElement | null>(null);
  const identityEditorRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);
  const [identityEditor, setIdentityEditor] = useState<{ threadId: string; kind: 'icon' | 'category' } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ threadId: string; top: number; left: number } | null>(null);
  const [renameThread, setRenameThread] = useState<Thread | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<Thread | null>(null);
  const [categoryDeleteCandidate, setCategoryDeleteCandidate] = useState<Category | null>(null);
  const [categoryActionMenu, setCategoryActionMenu] = useState<{ categoryId: string; top: number; left: number } | null>(null);
  const [renameCategory, setRenameCategory] = useState<Category | null>(null);
  const [renameCategoryDraft, setRenameCategoryDraft] = useState('');
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [pendingCategoryFilterId, setPendingCategoryFilterId] = useState<string | null>(null);
  const categoryMenu = useAnimatedVisibility();
  const selectedCategory = activeFilter.startsWith('category:')
    ? categories.find((category) => `category:${category.id}` === activeFilter)
    : undefined;
  const availableThreads = useMemo(() => allThreads.filter((thread) => !thread.isArchived), [allThreads]);
  const filterLabel = activeFilter === 'favorites'
    ? 'Favoritas'
    : activeFilter === 'archived'
      ? 'Arquivadas'
      : selectedCategory?.name ?? 'Todas as conversas';

  useDismissibleLayer(categoryMenu.visible, filterRef, categoryMenu.close);
  useEffect(() => {
    if (!pendingCategoryFilterId || !categories.some((category) => category.id === pendingCategoryFilterId)) return;
    onChangeFilter(`category:${pendingCategoryFilterId}`);
    setPendingCategoryFilterId(null);
  }, [categories, onChangeFilter, pendingCategoryFilterId]);
  const clearIdentityEditor = useCallback(() => setIdentityEditor(null), []);
  const { closing: closingIdentityEditor, close: closeIdentityEditor } = useAnimatedClose(clearIdentityEditor);
  useDismissibleLayer(Boolean(identityEditor), identityEditorRef, closeIdentityEditor);
  const clearRowMenu = useCallback(() => setRowMenu(null), []);
  const { closing: closingRowMenu, close: closeRowMenu } = useAnimatedClose(clearRowMenu);
  useDismissibleLayer(Boolean(rowMenu), rowMenuRef, closeRowMenu);
  const clearCategoryActionMenu = useCallback(() => setCategoryActionMenu(null), []);
  const { closing: closingCategoryActionMenu, close: closeCategoryActionMenu } = useAnimatedClose(clearCategoryActionMenu);
  useDismissibleLayer(Boolean(categoryActionMenu), categoryActionMenuRef, closeCategoryActionMenu);

  const createThread = () => { onCreateNewThread(); onCloseMobile(); };
  const selectThread = (id: string) => { onSelectThread(id); onCloseMobile(); };
  const editIcon = (thread: Thread) => {
    onSelectThread(thread.id);
    if (window.matchMedia('(max-width: 767px)').matches) {
      onCloseMobile();
      return;
    }
    setIdentityEditor({ threadId: thread.id, kind: 'icon' });
  };
  const openRowMenu = (thread: Thread, anchor: HTMLButtonElement) => {
    if (rowMenu?.threadId === thread.id) {
      closeRowMenu();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = 210;
    const height = 224;
    setRowMenu({
      threadId: thread.id,
      top: Math.min(rect.bottom + 5, window.innerHeight - height - 10),
      left: Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10)),
    });
  };
  const beginRename = (thread: Thread) => {
    closeRowMenu();
    setRenameDraft(thread.title);
    setRenameThread(thread);
  };
  const beginCategoryChange = (thread: Thread) => {
    closeRowMenu();
    setIdentityEditor({ threadId: thread.id, kind: 'category' });
  };
  const commitRename = () => {
    const nextTitle = renameDraft.trim();
    if (renameThread && nextTitle && nextTitle !== renameThread.title) onUpdateThread(renameThread.id, { title: nextTitle });
    setRenameThread(null);
  };
  const openCategoryActions = (category: Category, anchor: HTMLButtonElement) => {
    if (categoryActionMenu?.categoryId === category.id) {
      closeCategoryActionMenu();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = 168;
    const height = 92;
    setCategoryActionMenu({
      categoryId: category.id,
      top: Math.min(rect.bottom + 4, window.innerHeight - height - 10),
      left: Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10)),
    });
  };
  const beginCategoryRename = (category: Category) => {
    setRenameCategory(category);
    setRenameCategoryDraft(category.name);
    closeCategoryActionMenu();
    categoryMenu.close();
  };
  const commitCategoryRename = async () => {
    if (!renameCategory) return;
    const name = renameCategoryDraft.trim();
    if (!name) return;
    await onUpdateCategory(renameCategory.id, { name });
    setRenameCategory(null);
  };
  const normalizedCategoryDraft = renameCategoryDraft.trim().toLocaleLowerCase();
  const categoryRenameExists = Boolean(renameCategory && categories.some(
    (category) => category.id !== renameCategory.id && category.name.toLocaleLowerCase() === normalizedCategoryDraft,
  ));
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <header className="sidebar-header">
        <BrandLogo />
        <button className="sidebar-close" aria-label="Fechar menu" onClick={onCloseMobile}><X size={20} /></button>
      </header>

      <div className="new-thread-area">
        <button className="new-thread-button" onClick={createThread}>
          <span className="new-thread-button-icon" aria-hidden="true"><Plus size={18} /></span>
          <span className="new-thread-button-label">Nova conversa</span>
        </button>
      </div>

      <nav className="conversation-filters" aria-label="Filtrar conversas">
        <div className="category-filter" ref={filterRef}>
          <button
            className={`category-filter-trigger ${activeFilter !== 'all' ? 'active' : ''}`}
            onClick={() => {
              if (categoryMenu.visible) categoryMenu.close();
              else {
                setShowCategoryCreator(false);
                clearCategoryActionMenu();
                categoryMenu.open();
              }
            }}
            aria-expanded={categoryMenu.visible && !categoryMenu.closing}
          >
            {selectedCategory && <span className="category-dot" style={{ backgroundColor: selectedCategory.color }} />}
            <span>{filterLabel}</span>
            <ChevronDown size={15} />
          </button>
          {categoryMenu.visible && (
            showCategoryCreator ? (
              <div className="category-filter-manager">
                <CategoryPicker
                  activeCategory={selectedCategory?.name ?? ''}
                  categories={categories}
                  threads={allThreads}
                  onSelect={(categoryName, createdCategory) => {
                    const targetCategory = createdCategory ?? categories.find((item) => item.name === categoryName);
                    if (targetCategory) setPendingCategoryFilterId(targetCategory.id);
                    categoryMenu.close();
                  }}
                  onCreate={onCreateCategory}
                  onUpdate={onUpdateCategory}
                  onDelete={onDeleteCategory}
                  initialCreating
                  onBack={() => setShowCategoryCreator(false)}
                  description="Crie e organize os filtros da sidebar"
                  closing={categoryMenu.closing}
                />
              </div>
            ) : (
            <div className={`category-filter-menu menu-surface ${categoryMenu.closing ? 'animate-menu-close' : 'animate-menu-pop'}`} role="menu" aria-label="Filtros de conversa">
              <button className={activeFilter === 'all' ? 'selected' : ''} onClick={() => { onChangeFilter('all'); categoryMenu.close(); }}>
                <span className="category-dot category-dot--neutral" />
                <span>Todas as conversas</span>
                <small>{availableThreads.length}</small>
                {activeFilter === 'all' && <Check size={14} />}
              </button>
              <button className={activeFilter === 'favorites' ? 'selected' : ''} onClick={() => { onChangeFilter(activeFilter === 'favorites' ? 'all' : 'favorites'); categoryMenu.close(); }}>
                <Star size={15} fill={activeFilter === 'favorites' ? 'currentColor' : 'none'} />
                <span>Favoritas</span>
                <small>{availableThreads.filter((thread) => thread.isFavorite).length}</small>
                {activeFilter === 'favorites' && <Check size={14} />}
              </button>
              <button className={activeFilter === 'archived' ? 'selected' : ''} onClick={() => { onChangeFilter(activeFilter === 'archived' ? 'all' : 'archived'); categoryMenu.close(); }}>
                <Archive size={15} />
                <span>Arquivadas</span>
                <small>{allThreads.filter((thread) => thread.isArchived).length}</small>
                {activeFilter === 'archived' && <Check size={14} />}
              </button>
              <div className="category-filter-divider"><span>Categorias</span></div>
              {categories.map((category) => {
                const filter = `category:${category.id}` as ConversationFilter;
                const count = availableThreads.filter((thread) => thread.category === category.name).length;
                const isDefaultCategory = category.id === 'category-geral' || category.name.toLocaleLowerCase() === 'geral';
                return (
                  <div className="category-filter-row" key={category.id}>
                    <button className={`category-filter-choice ${activeFilter === filter ? 'selected' : ''}`} onClick={() => { onChangeFilter(activeFilter === filter ? 'all' : filter); categoryMenu.close(); }}>
                      <span className="category-dot" style={{ backgroundColor: category.color }} />
                      <span>{category.name}</span>
                      <small>{count}</small>
                      {activeFilter === filter && <Check size={14} />}
                    </button>
                    {!isDefaultCategory && (
                      <button
                        className="category-filter-more"
                        onClick={(event) => openCategoryActions(category, event.currentTarget)}
                        aria-label={`Opções da categoria ${category.name}`}
                        aria-expanded={categoryActionMenu?.categoryId === category.id && !closingCategoryActionMenu}
                      >
                        <MoreVertical size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="category-filter-footer">
                <button className="category-filter-create" onClick={() => setShowCategoryCreator(true)}><Plus size={15} />Nova categoria</button>
              </div>
            </div>
            )
          )}
          {categoryActionMenu && (() => {
            const category = categories.find((item) => item.id === categoryActionMenu.categoryId);
            if (!category) return null;
            return (
              <div
                className={`category-action-menu menu-surface ${closingCategoryActionMenu ? 'animate-menu-close' : 'animate-menu-pop'}`}
                ref={categoryActionMenuRef}
                style={{ top: categoryActionMenu.top, left: categoryActionMenu.left }}
                role="menu"
                aria-label={`Opções de ${category.name}`}
              >
                <button className="menu-item" role="menuitem" onClick={() => beginCategoryRename(category)}><Pencil size={15} />Renomear</button>
                <button className="menu-item danger" role="menuitem" onClick={() => { closeCategoryActionMenu(); categoryMenu.close(); setCategoryDeleteCandidate(category); }}><Trash2 size={15} />Excluir</button>
              </div>
            );
          })()}
        </div>
      </nav>

      <nav className="thread-list" aria-label="Conversas">
        <div className="thread-list-label"><span>{activeFilter === 'favorites' ? 'Favoritas' : activeFilter === 'archived' ? 'Arquivadas' : selectedCategory?.name ?? 'Conversas'}</span></div>
        {threads.map((thread) => {
          const categoryColor = categories.find((category) => category.name === thread.category)?.color;
          return (
            <div className={`thread-row ${thread.id === activeThreadId ? 'thread-row--active' : ''}`} key={thread.id}>
              <button className="thread-row-select" onClick={() => selectThread(thread.id)} aria-label={`Abrir ${thread.title}`} />
              <button className="thread-row-icon thread-row-edit-target" onClick={() => editIcon(thread)} aria-label={`Alterar emoji de ${thread.title}`}><ThreadVisual value={thread.icon} /></button>
              <span className="thread-row-copy">
                <span className="thread-row-title"><strong>{thread.title}</strong></span>
                {thread.category !== 'Geral' && (
                  <span
                    className="thread-row-category"
                    style={categoryColor ? {
                      backgroundColor: `color-mix(in srgb, ${categoryColor} 13%, transparent)`,
                      borderColor: `color-mix(in srgb, ${categoryColor} 32%, transparent)`,
                    } : undefined}
                  >
                    <span>{thread.category}</span>
                  </span>
                )}
              </span>
              <button
                className="thread-row-more"
                onClick={(event) => openRowMenu(thread, event.currentTarget)}
                aria-label={`Opções de ${thread.title}`}
                aria-expanded={rowMenu?.threadId === thread.id && !closingRowMenu}
              >
                <MoreVertical size={17} />
              </button>
            </div>
          );
        })}
        {threads.length === 0 && allThreads.length > 0 && <p className="thread-list-empty">Nenhuma conversa neste filtro.</p>}
      </nav>

      {rowMenu && (() => {
        const thread = allThreads.find((item) => item.id === rowMenu.threadId);
        if (!thread) return null;
        return (
          <div
            className={`sidebar-thread-menu menu-surface ${closingRowMenu ? 'animate-menu-close' : 'animate-menu-pop'}`}
            ref={rowMenuRef}
            style={{ top: rowMenu.top, left: rowMenu.left }}
            role="menu"
            aria-label={`Opções de ${thread.title}`}
          >
            <div className="sidebar-thread-menu-label">Ações rápidas</div>
            <button className="menu-item" role="menuitem" onClick={() => beginRename(thread)}><Pencil size={16} />Mudar nome</button>
            <button className="menu-item" role="menuitem" onClick={() => beginCategoryChange(thread)}><Tags size={16} />Mudar categoria</button>
            <button className="menu-item" role="menuitem" onClick={() => { closeRowMenu(); onUpdateThread(thread.id, { isArchived: !thread.isArchived }); }}>
              {thread.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {thread.isArchived ? 'Desarquivar' : 'Arquivar'}
            </button>
            <button className="menu-item danger" role="menuitem" onClick={() => { closeRowMenu(); setDeleteCandidate(thread); }}><Trash2 size={16} />Excluir</button>
          </div>
        );
      })()}

      {identityEditor && (() => {
        const thread = allThreads.find((item) => item.id === identityEditor.threadId);
        if (!thread) return null;
        return (
          <div className={`sidebar-identity-layer ${closingIdentityEditor ? 'animate-menu-close' : 'animate-menu-pop'}`} ref={identityEditorRef}>
            {identityEditor.kind === 'icon' ? (
              <Suspense fallback={<div className="sidebar-editor-loading">Carregando emojis…</div>}>
                <ThreadAppearancePicker onChange={(icon) => { onUpdateThread(thread.id, { icon }); closeIdentityEditor(); }} />
              </Suspense>
            ) : (
              <CategoryPicker
                activeCategory={thread.category}
                categories={categories}
                threads={allThreads}
                onSelect={(category) => { onUpdateThread(thread.id, { category }); closeIdentityEditor(); }}
                onCreate={onCreateCategory}
                onUpdate={onUpdateCategory}
                onDelete={onDeleteCategory}
              />
            )}
          </div>
        );
      })()}

      <footer className="sidebar-footer"><button onClick={() => { onOpenSettings(); onCloseMobile(); }}><Settings size={17} />Configurações</button></footer>

      {renameThread && (
        <ActionDialog
          title="Mudar nome da conversa"
          description="Use um nome curto que ajude você a encontrá-la depois."
          confirmLabel="Salvar nome"
          confirmDisabled={!renameDraft.trim()}
          onConfirm={commitRename}
          onClose={() => setRenameThread(null)}
        >
          <input
            className="action-dialog-input"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && renameDraft.trim()) commitRename(); }}
            autoFocus
            data-dialog-initial-focus
            aria-label="Novo nome da conversa"
          />
        </ActionDialog>
      )}

      {deleteCandidate && (
        <ActionDialog
          title="Excluir conversa?"
          description={`“${deleteCandidate.title}” e todas as suas mensagens serão removidas permanentemente.`}
          confirmLabel="Excluir conversa"
          destructive
          onConfirm={() => { onDeleteThread(deleteCandidate.id); setDeleteCandidate(null); }}
          onClose={() => setDeleteCandidate(null)}
        />
      )}

      {categoryDeleteCandidate && (
        <CategoryDeleteDialog
          category={categoryDeleteCandidate}
          conversationCount={allThreads.filter((thread) => thread.category === categoryDeleteCandidate.name).length}
          onDelete={onDeleteCategory}
          onClose={() => setCategoryDeleteCandidate(null)}
        />
      )}

      {renameCategory && (
        <ActionDialog
          title="Renomear categoria"
          description={categoryRenameExists ? 'Já existe uma categoria com esse nome.' : 'O novo nome será aplicado a todas as conversas vinculadas.'}
          confirmLabel="Salvar nome"
          confirmDisabled={!renameCategoryDraft.trim() || categoryRenameExists}
          onConfirm={commitCategoryRename}
          onClose={() => setRenameCategory(null)}
        >
          <input
            className="action-dialog-input"
            value={renameCategoryDraft}
            onChange={(event) => setRenameCategoryDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && renameCategoryDraft.trim() && !categoryRenameExists) void commitCategoryRename(); }}
            autoFocus
            data-dialog-initial-focus
            aria-label="Novo nome da categoria"
          />
        </ActionDialog>
      )}
    </aside>
  );
}
