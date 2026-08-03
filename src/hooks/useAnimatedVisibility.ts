import { useCallback, useEffect, useRef, useState } from 'react';

function getExitDelay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  const token = getComputedStyle(document.documentElement).getPropertyValue('--motion-exit').trim();
  if (token.endsWith('ms')) return Number.parseFloat(token);
  if (token.endsWith('s')) return Number.parseFloat(token) * 1000;
  return 160;
}

export function useAnimatedVisibility(initiallyVisible = false) {
  const [visible, setVisible] = useState(initiallyVisible);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const open = useCallback(() => {
    clearCloseTimer();
    setClosing(false);
    setVisible(true);
  }, [clearCloseTimer]);

  const close = useCallback(() => {
    if (!visible || closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
      closeTimer.current = null;
    }, getExitDelay());
  }, [closing, visible]);

  const toggle = useCallback(() => {
    if (visible && !closing) close();
    else open();
  }, [close, closing, open, visible]);

  const reset = useCallback((nextVisible = false) => {
    clearCloseTimer();
    setClosing(false);
    setVisible(nextVisible);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return { visible, closing, open, close, toggle, reset };
}

export function useAnimatedClose(onClosed: () => void) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setClosing(false);
      onClosed();
    }, getExitDelay());
  }, [closing, onClosed]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  return { closing, close };
}
