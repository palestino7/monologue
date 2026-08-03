import { ArrowLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { DEFAULT_CATEGORY_COLOR, getThreadColorName, THREAD_COLORS } from '../constants/threadAppearance';
import type { Category, PaletteColor, Thread } from '../types';
import { CategoryDeleteDialog } from './CategoryDeleteDialog';

interface CategoryPickerProps {
  activeCategory: string;
  categories: Category[];
  threads: Thread[];
  onSelect: (name: string, category?: Category) => void;
  onCreate: (name: string, color: PaletteColor) => Promise<Category>;
  onUpdate: (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  initialCreating?: boolean;
  onBack?: () => void;
  description?: string;
  closing?: boolean;
}

interface ColorSwatchesProps {
  value: PaletteColor;
  onChange: (color: PaletteColor) => void;
  label: string;
}

function ColorSwatches({ value, onChange, label }: ColorSwatchesProps) {
  return (
    <div className="category-color-swatches" role="group" aria-label={label}>
      {THREAD_COLORS.map((color) => (
        <button
          type="button"
          key={color}
          className={value === color ? 'selected' : ''}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`Usar ${getThreadColorName(color)}`}
          title={getThreadColorName(color)}
          aria-pressed={value === color}
        >
          {value === color && <Check size={11} />}
        </button>
      ))}
    </div>
  );
}

export function CategoryPicker({ activeCategory, categories, threads, onSelect, onCreate, onUpdate, onDelete, initialCreating = false, onBack, description = 'Organize o assunto desta conversa', closing = false }: CategoryPickerProps) {
  const [creating, setCreating] = useState(initialCreating);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<PaletteColor>(DEFAULT_CATEGORY_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState<PaletteColor>(DEFAULT_CATEGORY_COLOR);
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null);

  const create = async () => {
    const category = await onCreate(newName, newColor);
    onSelect(category.name, category);
    setNewName('');
    setNewColor(DEFAULT_CATEGORY_COLOR);
    setCreating(false);
  };

  return (
    <div className={`category-popover popover-surface ${closing ? 'animate-menu-close' : 'animate-menu-pop'}`}>
      <div className="popover-heading">
        {onBack && <button className="category-picker-back" onClick={onBack} aria-label="Voltar aos filtros"><ArrowLeft size={17} /></button>}
        <div><strong>Categorias</strong><span>{description}</span></div>
      </div>

      <div className="category-list">
        {categories.map((category) => {
          const count = threads.filter((thread) => thread.category === category.name).length;
          const selected = activeCategory === category.name;
          const isDefaultCategory = category.id === 'category-geral' || category.name.toLocaleLowerCase() === 'geral';
          return (
            <div
              className={`category-row ${selected ? 'selected' : ''}`}
              key={category.id}
              style={{ '--category-color': category.color } as CSSProperties}
            >
              {editingId === category.id ? (
                <form className="category-edit-form" onSubmit={(event) => {
                  event.preventDefault();
                  void onUpdate(category.id, { name: editingName, color: editingColor }).then(() => setEditingId(null));
                }}>
                  <div className="category-form-line">
                    {isDefaultCategory ? (
                      <span className="category-default-name">Geral</span>
                    ) : (
                      <input value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && !onBack) setEditingId(null); }} autoFocus aria-label="Novo nome da categoria" />
                    )}
                    <button className="category-save-button" type="submit" aria-label="Salvar categoria"><Check size={15} /></button>
                  </div>
                  <span className="category-color-label">Cor da categoria</span>
                  <ColorSwatches value={editingColor} onChange={setEditingColor} label={`Cor de ${category.name}`} />
                  {isDefaultCategory ? (
                    <span className="category-default-note">Categoria padrão do Monologue</span>
                  ) : (
                    <button className="category-delete-button" type="button" onClick={() => setDeleteCandidate(category)}>
                      <Trash2 size={15} />Excluir categoria
                    </button>
                  )}
                </form>
              ) : (
                <>
                  <button className="category-choice" onClick={() => onSelect(category.name)}>
                    <span className="category-dot" style={{ backgroundColor: category.color }} />
                    <span><strong>{category.name}</strong><small>{count} {count === 1 ? 'conversa' : 'conversas'}</small></span>
                    {selected && <Check size={16} />}
                  </button>
                  <button className="category-edit-button" onClick={() => { setEditingId(category.id); setEditingName(category.name); setEditingColor(category.color); }} aria-label={`Editar categoria ${category.name}`}><Pencil size={14} /></button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {creating ? (
        <form className="category-create-form" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <div className="category-form-line">
            <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && !onBack) setCreating(false); }} placeholder="Nome da categoria" autoFocus />
            <button className="category-create-button" type="submit" disabled={!newName.trim()}>Adicionar</button>
          </div>
          <span className="category-color-label">Cor da categoria</span>
          <ColorSwatches value={newColor} onChange={setNewColor} label="Cor da nova categoria" />
        </form>
      ) : (
        <button className="category-add-button" onClick={() => setCreating(true)}><Plus size={15} />Nova categoria</button>
      )}

      {deleteCandidate && (
        <CategoryDeleteDialog
          category={deleteCandidate}
          conversationCount={threads.filter((thread) => thread.category === deleteCandidate.name).length}
          onDelete={onDelete}
          onDeleted={() => setEditingId(null)}
          onClose={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
}
