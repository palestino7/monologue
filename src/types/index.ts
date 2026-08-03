export type MediaCategory = 'image' | 'video' | 'audio' | 'document';

export type PaletteColor =
  | '#3FAE68'
  | '#2EAAA4'
  | '#3F83D1'
  | '#8067D4'
  | '#C25391'
  | '#D45858'
  | '#DE783B'
  | '#C99A32';

export type ThreadColor = 'neutral' | PaletteColor;

export interface MediaAttachment {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  duration?: number;
}

export interface Message {
  id: string;
  threadId: string;
  content: string;
  mediaType?: MediaCategory;
  mediaAttachment?: MediaAttachment;
  isStarred: boolean;
  createdAt: number;
}

export interface Thread {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: ThreadColor;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: PaletteColor;
  createdAt: number;
}
