import { Check, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAnimatedClose } from '../hooks/useAnimatedVisibility';

export interface ToastData {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const finalizeDismiss = useCallback(onDismiss, [onDismiss]);
  const { closing, close } = useAnimatedClose(finalizeDismiss);

  useEffect(() => {
    const timer = window.setTimeout(close, toast.actionLabel ? 5200 : 3000);
    return () => window.clearTimeout(timer);
  }, [close, toast.actionLabel, toast.id]);

  return createPortal(
    <div className={`app-toast ${closing ? 'animate-toast-close' : 'animate-toast-in'}`} role="status">
      <Check size={16} />
      <span>{toast.message}</span>
      {toast.actionLabel && <button onClick={() => { void toast.onAction?.(); close(); }}>{toast.actionLabel}</button>}
      <button className="app-toast-close" onClick={close} aria-label="Fechar aviso"><X size={15} /></button>
    </div>,
    document.body,
  );
}
