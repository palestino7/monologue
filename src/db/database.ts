import Dexie, { type Table } from 'dexie';
import { DEFAULT_CATEGORY_COLOR, THREAD_COLORS } from '../constants/threadAppearance';
import type { PaletteColor, ThreadColor } from '../types';

export interface DbThread {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: ThreadColor;
  isPinned: 0 | 1;
  isFavorite?: 0 | 1;
  isArchived: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface DbCategory {
  id: string;
  name: string;
  color: PaletteColor;
  createdAt: number;
}

export interface DbMessage {
  id: string;
  threadId: string;
  content: string;
  iv: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  encryptedMedia?: ArrayBuffer;
  mediaIv?: string;
  mediaName?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  mediaDuration?: number;
  isStarred: 0 | 1;
  createdAt: number;
}

export function normalizeDefaultCategoryRecords(categories: DbCategory[], threads: DbThread[]) {
  const defaultCandidates = categories.filter(
    (category) => category.id === 'category-geral' || category.name.trim().toLocaleLowerCase() === 'geral',
  );
  const preferredDefault = defaultCandidates.find((category) => category.id === 'category-geral') ?? defaultCandidates[0];
  const defaultAliases = new Set(defaultCandidates.map((category) => category.name));
  const canonicalDefault: DbCategory = {
    id: 'category-geral',
    name: 'Geral',
    color: preferredDefault?.color ?? DEFAULT_CATEGORY_COLOR,
    createdAt: preferredDefault?.createdAt ?? Date.now(),
  };

  return {
    categories: [
      ...categories.filter((category) => !defaultCandidates.some((candidate) => candidate.id === category.id)),
      canonicalDefault,
    ].sort((a, b) => a.createdAt - b.createdAt),
    threads: threads.map((thread) => (
      defaultAliases.has(thread.category) || thread.category.trim().toLocaleLowerCase() === 'geral'
        ? { ...thread, category: 'Geral' }
        : thread
    )),
  };
}

export class MonologueDatabase extends Dexie {
  threads!: Table<DbThread>;
  messages!: Table<DbMessage>;
  categories!: Table<DbCategory>;

  constructor() {
    super('MonologueEncryptedDB');

    const legacySchema = {
      threads: 'id, category, isPinned, isArchived, updatedAt, createdAt',
      messages: 'id, threadId, mediaType, isStarred, createdAt',
      settings: 'key',
    };

    this.version(1).stores(legacySchema);

    this.version(2)
      .stores(legacySchema)
      .upgrade((transaction) => {
        const colorMigration: Record<string, string> = {
          '#4285F4': '#687FA5',
          '#EA4335': '#B76678',
          '#34A853': '#73906F',
          '#FBBC04': '#D09A45',
          '#A142F4': '#8A6F9A',
          '#F43F5E': '#B76678',
          '#06B6D4': '#4F8B8D',
          '#F97316': '#C46A4A',
        };

        return transaction.table('threads').toCollection().modify((thread) => {
          thread.color = colorMigration[thread.color] || thread.color;
        });
      });

    this.version(3)
      .stores(legacySchema)
      .upgrade(async (transaction) => {
        const defaultColors: Record<string, string> = {
          'default-study': '#4F8B7A',
          'default-life': '#B86F6F',
          'default-finance': '#6B8F71',
        };

        await transaction.table('threads').toCollection().modify((thread) => {
          if (defaultColors[thread.id]) thread.color = defaultColors[thread.id];
        });
      });

    this.version(4).stores({ settings: null });

    this.version(5)
      .stores({
        threads: 'id, category, isPinned, isFavorite, isArchived, updatedAt, createdAt',
        messages: 'id, threadId, mediaType, isStarred, createdAt',
        categories: 'id, &name, createdAt',
        conversationLists: 'id, &name, createdAt',
      })
      .upgrade(async (transaction) => {
        const threads = await transaction.table<DbThread>('threads').toArray();
        const names = new Set(['Geral', ...threads.map((thread) => thread.category).filter(Boolean)]);
        const now = Date.now();
        await transaction.table<DbCategory>('categories').bulkPut(
          [...names].map((name, index) => ({
            id: `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || index}`,
            name,
            color: THREAD_COLORS[index % THREAD_COLORS.length],
            createdAt: now + index,
          })),
        );
      });

    this.version(6)
      .stores({
        threads: 'id, category, isPinned, isFavorite, isArchived, updatedAt, createdAt',
        messages: 'id, threadId, mediaType, isStarred, createdAt',
        categories: 'id, &name, createdAt',
        conversationLists: null,
      })
      .upgrade(async (transaction) => {
        await transaction.table<DbThread>('threads').toCollection().modify({ color: 'neutral' });
        const categories = await transaction.table<DbCategory>('categories').orderBy('createdAt').toArray();
        await Promise.all(categories.map((category, index) => transaction.table<DbCategory>('categories').update(category.id, {
          color: THREAD_COLORS[index % THREAD_COLORS.length],
        })));
      });

    this.version(7)
      .stores({
        threads: 'id, category, isPinned, isFavorite, isArchived, updatedAt, createdAt',
        messages: 'id, threadId, mediaType, isStarred, createdAt',
        categories: 'id, &name, createdAt',
      })
      .upgrade(async (transaction) => {
        const vividColorMigration: Record<string, PaletteColor> = {
          '#5F8A63': '#3FAE68',
          '#4F8581': '#2EAAA4',
          '#587DA8': '#3F83D1',
          '#756DA5': '#8067D4',
          '#9A6685': '#C25391',
          '#A96666': '#D45858',
          '#AD744F': '#DE783B',
          '#9A824F': '#C99A32',
        };

        await transaction.table<DbThread>('threads').toCollection().modify((thread) => {
          if (thread.color !== 'neutral' && vividColorMigration[thread.color]) {
            thread.color = vividColorMigration[thread.color];
          }
        });
        await transaction.table<DbCategory>('categories').toCollection().modify((category) => {
          if (vividColorMigration[category.color]) category.color = vividColorMigration[category.color];
        });
      });

    this.version(8)
      .stores({
        threads: 'id, category, isPinned, isFavorite, isArchived, updatedAt, createdAt',
        messages: 'id, threadId, mediaType, isStarred, createdAt',
        categories: 'id, &name, createdAt',
      })
      .upgrade(async (transaction) => {
        const categoryTable = transaction.table<DbCategory>('categories');
        const threadTable = transaction.table<DbThread>('threads');
        const normalized = normalizeDefaultCategoryRecords(
          await categoryTable.toArray(),
          await threadTable.toArray(),
        );
        await categoryTable.clear();
        await categoryTable.bulkPut(normalized.categories);
        await threadTable.bulkPut(normalized.threads);
      });
  }
}

export const db = new MonologueDatabase();

export async function seedInitialDataIfEmpty() {
  if (await db.categories.count()) return;
  await db.categories.put({
    id: 'category-geral',
    name: 'Geral',
    color: DEFAULT_CATEGORY_COLOR,
    createdAt: Date.now(),
  });
}
