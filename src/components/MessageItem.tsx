import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, Copy, Trash2, FileText, Download, ChevronDown } from 'lucide-react';
import type { Message, MediaAttachment } from '../types';
import { VoicePlayer } from './VoicePlayer';
import { useAnimatedVisibility } from '../hooks/useAnimatedVisibility';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';

interface MessageItemProps {
  message: Message;
  onStar: (id: string, currentStarred: boolean) => void;
  onDelete: (id: string) => void;
  onOpenMedia: (media: MediaAttachment) => void;
  focused?: boolean;
  onFeedback: (message: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onStar,
  onDelete,
  onOpenMedia,
  focused = false,
  onFeedback,
}) => {
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuLayer = useAnimatedVisibility();
  const { visible: showMenu, closing: closingMenu, close: closeMenu } = menuLayer;

  useDismissibleLayer(showMenu, [menuRef, menuBtnRef], closeMenu);

  const updateMenuPosition = useCallback(() => {
    if (!menuBtnRef.current) return;
    const buttonRect = menuBtnRef.current.getBoundingClientRect();
    setMenuPosition({
      top: buttonRect.bottom + 4,
      right: Math.max(8, window.innerWidth - buttonRect.right),
    });
  }, []);

  useEffect(() => {
    if (showMenu) {
      updateMenuPosition();
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);
      return () => {
        window.removeEventListener('resize', updateMenuPosition);
        window.removeEventListener('scroll', updateMenuPosition, true);
      };
    }
  }, [showMenu, updateMenuPosition]);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopy = async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      onFeedback('Mensagem copiada.');
    }
  };

  const isVoice = message.mediaType === 'audio';
  const isImage = message.mediaType === 'image';
  const isVideo = message.mediaType === 'video';
  const isDoc = message.mediaType === 'document';

  return (
      <div
        id={`message-${message.id}`}
        className={`message-row animate-fade-in ${focused ? 'message-row--focused' : ''}`}
        data-menu-open={showMenu || undefined}
      >
        <div
          className="message-bubble"
          data-media={isVoice ? 'voice' : isImage || isVideo ? 'visual' : undefined}
      >
            <button
              className="message-action-button"
              ref={menuBtnRef}
              onClick={() => {
                if (!showMenu) updateMenuPosition();
                menuLayer.toggle();
              }}
              title="Ações da mensagem"
            >
              <ChevronDown size={14} />
            </button>

        {showMenu &&
          menuPosition &&
          createPortal(
            <div
              ref={menuRef}
              className={`menu-surface message-menu ${closingMenu ? 'animate-menu-close' : 'animate-menu-pop'}`}
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
              }}
              role="menu"
              aria-label="Ações da mensagem"
            >
              {message.content && (
              <button
                onClick={() => {
                  handleCopy();
                  closeMenu();
                }}
                className="menu-item"
                role="menuitem"
                title="Copiar texto"
              >
                  <Copy size={15} />
                  Copiar
                </button>
              )}

              <button
                onClick={() => {
                  onStar(message.id, message.isStarred);
                  closeMenu();
                }}
                className={`menu-item ${message.isStarred ? 'is-favorite' : ''}`}
                role="menuitem"
                title={message.isStarred ? 'Remover dos favoritos' : 'Favoritar mensagem'}
              >
                <Star size={15} fill={message.isStarred ? 'currentColor' : 'none'} />
                {message.isStarred ? 'Desfavoritar' : 'Favoritar'}
              </button>

              <button
                onClick={() => {
                  onDelete(message.id);
                  closeMenu();
                }}
                className="menu-item danger"
                role="menuitem"
                title="Excluir mensagem"
              >
                <Trash2 size={15} />
                Excluir
              </button>
            </div>,
            document.body,
          )}
        {message.mediaAttachment && (
          <div className={message.content ? 'message-media message-media--with-caption' : 'message-media'}>
            {isVoice && message.mediaAttachment.previewUrl && (
              <VoicePlayer
                src={message.mediaAttachment.previewUrl}
                duration={message.mediaAttachment.duration}
              />
            )}

            {isImage && message.mediaAttachment.previewUrl && (
              <img
                src={message.mediaAttachment.previewUrl}
                alt={message.mediaAttachment.name}
                onClick={() => onOpenMedia(message.mediaAttachment!)}
                className="message-visual-media"
              />
            )}

            {isVideo && message.mediaAttachment.previewUrl && (
              <video
                src={message.mediaAttachment.previewUrl}
                controls
                className="message-visual-media"
              />
            )}

            {isDoc && message.mediaAttachment.previewUrl && (
              <a
                href={message.mediaAttachment.previewUrl}
                download={message.mediaAttachment.name}
                className="message-document"
              >
                <FileText size={24} />
                <div className="message-document-copy">
                  <div className="message-document-name">
                    {message.mediaAttachment.name}
                  </div>
                  <div className="message-document-size">
                    {(message.mediaAttachment.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <Download className="message-document-download" size={18} />
              </a>
            )}
          </div>
        )}

        {message.content && (
          <div
            className={`message-content ${isImage || isVideo ? 'message-content--media' : ''}`}
          >
            {message.content}
          </div>
        )}

        <div
          className={`message-meta ${isImage || isVideo ? 'message-meta--media' : ''}`}
        >
          <span>
            {formattedTime}
          </span>
          {message.isStarred && <Star size={11} fill="currentColor" aria-label="Mensagem favorita" />}
        </div>
      </div>
    </div>
  );
};
