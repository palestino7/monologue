import { useState } from 'react';
import type { Category } from '../types';
import { ActionDialog } from './ActionDialog';

interface CategoryDeleteDialogProps {
  category: Category;
  conversationCount: number;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  onDeleted?: () => void;
}

export function CategoryDeleteDialog({ category, conversationCount, onDelete, onClose, onDeleted }: CategoryDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const moveDescription = conversationCount === 0
    ? 'Nenhuma conversa será alterada.'
    : conversationCount === 1
      ? 'A conversa vinculada será movida para Geral.'
      : `As ${conversationCount} conversas vinculadas serão movidas para Geral.`;

  return (
    <ActionDialog
      title="Excluir categoria?"
      description={`“${category.name}” será excluída. ${moveDescription}`}
      confirmLabel="Excluir categoria"
      destructive
      isWorking={isDeleting}
      onConfirm={async () => {
        setIsDeleting(true);
        try {
          await onDelete(category.id);
          onDeleted?.();
          onClose();
        } finally {
          setIsDeleting(false);
        }
      }}
      onClose={onClose}
    />
  );
}
