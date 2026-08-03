import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Categories, EmojiStyle, Theme } from 'emoji-picker-react';
import type { EmojiClickData, PickerProps } from 'emoji-picker-react';
import ptEmojiDataUrl from 'emoji-picker-react/dist/data/emojis-pt.json?url';

interface ThreadAppearancePickerProps {
  onChange: (emoji: string) => void;
  closing?: boolean;
}

interface EmojiRecord {
  u: string;
  v?: string[];
}

function normalizeUnified(value: string): string {
  return value.replaceAll('-fe0f', '');
}

function emojiFromUnified(unified: string): string {
  return unified
    .split('-')
    .map((codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .join('');
}

function findSkinToneOptions(
  emojiData: NonNullable<PickerProps['emojiData']>,
  unified: string,
): string[] {
  const normalized = normalizeUnified(unified);
  const emojis = Object.values(emojiData.emojis).flat() as EmojiRecord[];
  const match = emojis.find((emoji) => normalizeUnified(emoji.u) === normalized);
  return match?.v?.length ? [match.u, ...match.v] : [];
}

interface TonePickerPosition {
  top: number;
  left: number;
}

const TONE_PICKER_WIDTH = 194;

export function ThreadAppearancePicker({ onChange, closing = false }: ThreadAppearancePickerProps) {
  const [emojiData, setEmojiData] = useState<PickerProps['emojiData']>();
  const [skinToneOptions, setSkinToneOptions] = useState<string[]>([]);
  const [tonePickerPosition, setTonePickerPosition] = useState<TonePickerPosition | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(ptEmojiDataUrl, { signal: controller.signal })
      .then((response) => response.json() as Promise<NonNullable<PickerProps['emojiData']>>)
      .then(setEmojiData)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Não foi possível carregar o catálogo de emojis em português.', error);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!emojiData) return;
    const frame = window.requestAnimationFrame(() => {
      popoverRef.current?.querySelector<HTMLInputElement>('.epr-search-container input')?.setAttribute('aria-label', 'Buscar emoji');
      popoverRef.current?.querySelector<HTMLElement>('.epr-category-nav')?.setAttribute('aria-label', 'Categorias de emojis');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [emojiData]);

  const selectEmoji = (selection: EmojiClickData, event: MouseEvent) => {
    if (!emojiData) return;
    const options = findSkinToneOptions(emojiData, selection.unifiedWithoutSkinTone);
    if (options.length) {
      setSkinToneOptions(options);
      const target = (event.target as HTMLElement).closest('button');
      const popover = popoverRef.current;
      if (target && popover) {
        const targetRect = target.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        setTonePickerPosition({
          top: Math.max(54, targetRect.top - popoverRect.top - 38),
          left: Math.max(6, Math.min(popoverRect.width - TONE_PICKER_WIDTH - 6, targetRect.left - popoverRect.left + targetRect.width / 2 - TONE_PICKER_WIDTH / 2)),
        });
      }
      return;
    }
    setSkinToneOptions([]);
    setTonePickerPosition(null);
    onChange(selection.emoji);
  };

  return (
    <div ref={popoverRef} className={`appearance-popover popover-surface animate-menu-pop ${closing ? 'animate-menu-close' : ''}`}>
      {emojiData ? <EmojiPicker
        width="100%"
        height={360}
        theme={Theme.AUTO}
        emojiStyle={EmojiStyle.NATIVE}
        emojiData={emojiData}
        categories={[
          { category: Categories.SUGGESTED, name: 'Mais usados' },
          { category: Categories.SMILEYS_PEOPLE, name: 'Emoções e pessoas' },
          { category: Categories.ANIMALS_NATURE, name: 'Animais e natureza' },
          { category: Categories.FOOD_DRINK, name: 'Comidas e bebidas' },
          { category: Categories.TRAVEL_PLACES, name: 'Viagens e lugares' },
          { category: Categories.ACTIVITIES, name: 'Atividades' },
          { category: Categories.OBJECTS, name: 'Objetos' },
          { category: Categories.SYMBOLS, name: 'Símbolos' },
          { category: Categories.FLAGS, name: 'Bandeiras' },
        ]}
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
        searchPlaceholder="Buscar emoji"
        searchClearButtonLabel="Limpar busca"
        onEmojiClick={selectEmoji}
      /> : <div className="emoji-catalog-loading">Carregando emojis…</div>}
      {skinToneOptions.length > 0 && tonePickerPosition && (
        <div
          className="emoji-variation-strip animate-menu-pop"
          role="group"
          aria-label="Variações do emoji"
          style={{ top: tonePickerPosition.top, left: tonePickerPosition.left }}
        >
          {skinToneOptions.map((unified) => {
            const emoji = emojiFromUnified(unified);
            return (
              <button
                key={unified}
                onClick={() => { onChange(emoji); setSkinToneOptions([]); setTonePickerPosition(null); }}
                aria-label={`Usar ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
