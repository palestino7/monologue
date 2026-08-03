import { MessageSquare } from 'lucide-react';
import { DEFAULT_THREAD_ICON, getThreadEmoji } from '../constants/threadAppearance';

interface ThreadVisualProps {
  value: string;
  size?: 'sidebar' | 'header';
}

export function ThreadVisual({ value, size = 'sidebar' }: ThreadVisualProps) {
  const iconSize = size === 'header' ? 24 : 21;

  if (value === DEFAULT_THREAD_ICON) {
    return <MessageSquare size={iconSize} strokeWidth={1.9} aria-hidden="true" />;
  }

  return <span className={`thread-emoji thread-emoji--${size}`} aria-hidden="true">{getThreadEmoji(value)}</span>;
}
