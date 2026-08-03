import { useEffect, type RefObject } from 'react';

export function useDismissibleLayer(
  open: boolean,
  boundaryRef: RefObject<HTMLElement | null> | ReadonlyArray<RefObject<HTMLElement | null>>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const boundaries = Array.isArray(boundaryRef) ? boundaryRef : [boundaryRef];
      const clickedInside = boundaries.some((ref) => ref.current?.contains(event.target as Node));
      if (!clickedInside) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [boundaryRef, onDismiss, open]);
}
