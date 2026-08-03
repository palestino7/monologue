import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { FileText, Image, Mic, Paperclip, Send, Video, X, type LucideIcon } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioRecorderBar } from './AudioRecorderBar';
import type { MediaCategory } from '../types';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';
import { useAnimatedVisibility } from '../hooks/useAnimatedVisibility';
import { ActionDialog } from './ActionDialog';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    mediaFile?: { file: File; mediaType: MediaCategory; duration?: number },
  ) => Promise<void>;
}

interface PendingFile {
  file: File;
  mediaType: MediaCategory;
  previewUrl: string;
}

interface AttachmentOption {
  label: string;
  accept: string;
  category: MediaCategory;
  Icon: LucideIcon;
}

const ATTACHMENT_OPTIONS: AttachmentOption[] = [
  { label: 'Foto', accept: 'image/*', category: 'image', Icon: Image },
  { label: 'Vídeo', accept: 'video/*', category: 'video', Icon: Video },
  { label: 'Arquivo', accept: '*/*', category: 'document', Icon: FileText },
];

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerInnerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMediaCategory = useRef<MediaCategory>('document');
  const recorder = useAudioRecorder();
  const attachmentLayer = useAnimatedVisibility();
  const { visible: showAttachmentMenu, closing: closingAttachmentMenu } = attachmentLayer;
  const closeAttachmentMenu = attachmentLayer.close;

  useDismissibleLayer(showAttachmentMenu, composerInnerRef, closeAttachmentMenu);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
  }, [text]);

  useEffect(() => {
    return () => {
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    };
  }, [pendingFile]);

  const send = async () => {
    if (!text.trim() && !pendingFile) return;
    const content = text.trim();
    const media = pendingFile
      ? { file: pendingFile.file, mediaType: pendingFile.mediaType }
      : undefined;

    setText('');
    setPendingFile(null);
    await onSendMessage(content, media);
  };

  const selectAttachment = ({ accept, category }: AttachmentOption) => {
    closeAttachmentMenu();
    selectedMediaCategory.current = category;
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const receiveFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile({
      file,
      mediaType: selectedMediaCategory.current,
      previewUrl: URL.createObjectURL(file),
    });
    event.target.value = '';
  };

  const sendVoiceNote = async () => {
    const recording = await recorder.stopRecording();
    if (!recording) return;
    await onSendMessage('', {
      file: recording.file,
      mediaType: 'audio',
      duration: recording.duration,
    });
  };

  if (recorder.isRecording) {
    return (
      <div className="recording-composer-wrap">
        <AudioRecorderBar
          recordingTime={recorder.recordingTime}
          audioLevels={recorder.audioLevels}
          isPaused={recorder.isPaused}
          onPause={recorder.pauseRecording}
          onCancel={recorder.cancelRecording}
          onSend={sendVoiceNote}
        />
      </div>
    );
  }

  return (
    <>
    <div className="composer-wrap">
      <div className="composer-inner" ref={composerInnerRef}>
        <input ref={fileInputRef} type="file" accept="*/*" onChange={receiveFile} hidden />

        {showAttachmentMenu && (
          <div className={`attachment-menu ${closingAttachmentMenu ? 'animate-fade-close' : 'animate-fade-in'}`}>
            {ATTACHMENT_OPTIONS.map((option) => (
              <button key={option.category} className={`attachment-option attachment-option--${option.category}`} onClick={() => selectAttachment(option)}>
                <option.Icon size={19} />
                {option.label}
              </button>
            ))}
          </div>
        )}

        {pendingFile && (
          <div className="pending-attachment">
            {pendingFile.mediaType === 'image' && <img src={pendingFile.previewUrl} alt="Prévia do anexo" />}
            <div>
              <strong>{pendingFile.file.name}</strong>
              <small>{(pendingFile.file.size / 1024).toFixed(1)} KB</small>
            </div>
            <button onClick={() => setPendingFile(null)} aria-label="Remover anexo"><X size={17} /></button>
          </div>
        )}

        <div className="composer">
          <button className="composer-secondary-action" onClick={attachmentLayer.toggle} aria-label="Anexar mídia">
            <Paperclip size={20} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onFocus={closeAttachmentMenu}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Escreva como você pensa..."
            rows={1}
          />
          {text.trim() || pendingFile ? (
            <button className="composer-primary-action" onClick={() => void send()} aria-label="Enviar"><Send size={18} /></button>
          ) : (
            <button className="composer-mic-action" onClick={recorder.startRecording} aria-label="Gravar nota de voz"><Mic size={19} /></button>
          )}
        </div>
      </div>
    </div>
    {recorder.error && (
      <ActionDialog
        title="Microfone indisponível"
        description={recorder.error}
        confirmLabel="Entendi"
        cancelLabel=""
        onConfirm={recorder.clearError}
        onClose={recorder.clearError}
      />
    )}
    </>
  );
}
