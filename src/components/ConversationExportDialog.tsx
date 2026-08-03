import { CalendarRange, Download, X } from 'lucide-react';
import { useState } from 'react';
import { createConversationExport } from '../services/backup';
import type { Message, Thread } from '../types';
import { useAnimatedClose } from '../hooks/useAnimatedVisibility';
import { useEscapeDismiss } from '../hooks/useEscapeDismiss';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface ConversationExportDialogProps {
  thread: Thread;
  messages: Message[];
  onClose: () => void;
  onExported?: () => void;
}

export function ConversationExportDialog({ thread, messages, onClose, onExported }: ConversationExportDialogProps) {
  const [mode, setMode] = useState<'all' | 'range'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const { closing, close } = useAnimatedClose(onClose);
  const dialogRef = useDialogFocus<HTMLElement>();

  useEscapeDismiss(close, !exporting);

  const exportConversation = async () => {
    setExporting(true);
    try {
      const range = mode === 'range' ? {
        from: from ? new Date(`${from}T00:00:00`).getTime() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).getTime() : undefined,
      } : undefined;
      const file = await createConversationExport(thread, messages, range);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      onExported?.();
      close();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`modal-backdrop ${closing ? 'animate-overlay-close' : 'animate-overlay-open'}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialogRef} className={`export-dialog ${closing ? 'animate-dialog-close' : 'animate-dialog-open'}`} role="dialog" aria-modal="true" aria-labelledby="export-title" tabIndex={-1}>
        <header>
          <div><Download size={18} /><h2 id="export-title">Exportar conversa</h2></div>
          <button onClick={close} aria-label="Fechar exportação"><X size={18} /></button>
        </header>
        <p>O ZIP terá uma transcrição em TXT e uma pasta com as mídias deste período.</p>
        <div className="export-options">
          <button className={mode === 'all' ? 'selected' : ''} onClick={() => setMode('all')}><Download size={17} /><span><strong>Toda a conversa</strong><small>{messages.length} mensagens</small></span></button>
          <button className={mode === 'range' ? 'selected' : ''} onClick={() => setMode('range')}><CalendarRange size={17} /><span><strong>Intervalo personalizado</strong><small>Escolha a data inicial e final</small></span></button>
        </div>
        {mode === 'range' && <div className="date-range-fields"><label>De<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>}
        <footer><button className="secondary-action" onClick={close}>Cancelar</button><button className="primary-action" onClick={() => void exportConversation()} disabled={exporting}>{exporting ? 'Preparando…' : 'Exportar ZIP'}</button></footer>
      </section>
    </div>
  );
}
