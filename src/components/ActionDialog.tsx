import { useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Pencil, X } from 'lucide-react';
import { useAnimatedClose } from '../hooks/useAnimatedVisibility';
import { useEscapeDismiss } from '../hooks/useEscapeDismiss';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface ActionDialogProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  isWorking?: boolean;
  children?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ActionDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  confirmDisabled = false,
  isWorking = false,
  children,
  onConfirm,
  onClose,
}: ActionDialogProps) {
  const finalizeClose = useCallback(onClose, [onClose]);
  const { closing, close } = useAnimatedClose(finalizeClose);
  const dialogRef = useDialogFocus<HTMLElement>();

  useEscapeDismiss(close);

  return createPortal(
    <div className={`modal-backdrop action-dialog-backdrop ${closing ? 'animate-overlay-close' : 'animate-overlay-open'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section
        ref={dialogRef}
        className={`action-dialog ${closing ? 'animate-dialog-close' : 'animate-dialog-open'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        tabIndex={-1}
      >
        <header>
          <div className={destructive ? 'action-dialog-symbol action-dialog-symbol--danger' : 'action-dialog-symbol'}>
            {destructive ? <AlertTriangle size={18} /> : <Pencil size={18} />}
          </div>
          <button className="icon-button" onClick={close} aria-label="Fechar"><X size={18} /></button>
        </header>
        <h2 id="action-dialog-title">{title}</h2>
        {description && <p>{description}</p>}
        {children && <div className="action-dialog-content">{children}</div>}
        <footer>
          {cancelLabel && <button className="secondary-action" onClick={close}>{cancelLabel}</button>}
          <button
            className={destructive ? 'primary-action action-dialog-danger' : 'primary-action'}
            disabled={confirmDisabled || isWorking}
            onClick={() => void onConfirm()}
          >
            {isWorking ? 'Processando…' : confirmLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
