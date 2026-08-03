import { Download, X } from 'lucide-react';
import type { MediaAttachment } from '../types';
import { useAnimatedClose } from '../hooks/useAnimatedVisibility';
import { useEscapeDismiss } from '../hooks/useEscapeDismiss';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface MediaLightboxProps {
  media: MediaAttachment | null;
  onClose: () => void;
}

export function MediaLightbox({ media, onClose }: MediaLightboxProps) {
  const { closing, close } = useAnimatedClose(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(Boolean(media?.previewUrl));

  useEscapeDismiss(close, Boolean(media?.previewUrl));

  if (!media?.previewUrl) return null;

  const download = () => {
    const anchor = document.createElement('a');
    anchor.href = media.previewUrl!;
    anchor.download = media.name || 'monologue-media';
    anchor.click();
  };

  return (
    <div ref={dialogRef} className={`media-lightbox ${closing ? 'animate-overlay-close' : 'animate-overlay-open'}`} onClick={close} role="dialog" aria-modal="true" aria-label={media.name} tabIndex={-1}>
      <header className="media-lightbox-header" onClick={(event) => event.stopPropagation()}>
        <span>{media.name}</span>
        <div>
          <button onClick={download} aria-label="Baixar mídia"><Download size={19} /></button>
          <button onClick={close} aria-label="Fechar visualização"><X size={21} /></button>
        </div>
      </header>

      <div className="media-lightbox-content" onClick={(event) => event.stopPropagation()}>
        {media.type.includes('video') ? (
          <video src={media.previewUrl} controls autoPlay />
        ) : (
          <img src={media.previewUrl} alt={media.name} />
        )}
      </div>
    </div>
  );
}
