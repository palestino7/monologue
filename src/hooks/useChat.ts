import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DbThread, type DbMessage } from '../db/database';
import { useLocalEncryption } from '../context/localEncryption';
import {
  encryptString,
  decryptString,
  encryptArrayBuffer,
  decryptArrayBuffer,
} from '../crypto/encryption';
import type { Category, Message, Thread, MediaCategory, PaletteColor, ThreadColor } from '../types';
import { DEFAULT_CATEGORY_COLOR, DEFAULT_THREAD_COLOR, DEFAULT_THREAD_ICON } from '../constants/threadAppearance';

const ACTIVE_THREAD_STORAGE_KEY = 'monologue.active-thread';

function readStoredActiveThreadId() {
  try {
    return localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

const LEGACY_MEDIA_MIME_TYPES: Record<MediaCategory, string> = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  document: 'application/octet-stream',
};

export function useChat() {
  const { encryptionKey } = useLocalEncryption();
  const [activeThreadId, setActiveThreadId] = useState<string>(readStoredActiveThreadId);
  const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const decryptedMessagesRef = useRef<Message[]>([]);

  const rawThreads = useLiveQuery(() => db.threads.toArray(), []);
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), []) || [];
  const threads: Thread[] = (rawThreads || []).map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    icon: t.icon,
    color: t.color,
    isPinned: Boolean(t.isPinned),
    isFavorite: Boolean(t.isFavorite),
    isArchived: Boolean(t.isArchived),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  })).sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  useEffect(() => {
    if (rawThreads?.length && !rawThreads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(rawThreads[0].id);
    }
  }, [rawThreads, activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    try {
      localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, activeThreadId);
    } catch {
      // A conversa continua funcional mesmo quando o armazenamento do navegador está indisponível.
    }
  }, [activeThreadId]);

  const rawMessages = useLiveQuery(
    () =>
      activeThreadId
        ? db.messages.where('threadId').equals(activeThreadId).sortBy('createdAt')
        : [],
    [activeThreadId]
  );

  const decryptAllMessages = useCallback(async () => {
    if (!encryptionKey || !rawMessages) {
      setDecryptedMessages([]);
      return;
    }

    setIsDecrypting(true);
    try {
      const decryptedList: Message[] = await Promise.all(
        rawMessages.map(async (msg) => {
          let content = '';
          try {
            content = await decryptString(msg.content, msg.iv, encryptionKey);
          } catch {
            content = '[Conteúdo corrompido ou erro de chave]';
          }

          let mediaAttachment;
          if (msg.mediaType && msg.encryptedMedia && msg.mediaIv) {
            try {
              const decryptedBuffer = await decryptArrayBuffer(
                msg.encryptedMedia,
                msg.mediaIv,
                encryptionKey
              );

              const mimeType = msg.mediaMimeType || LEGACY_MEDIA_MIME_TYPES[msg.mediaType];
              const blob = new Blob([decryptedBuffer], { type: mimeType });
              const previewUrl = URL.createObjectURL(blob);

              mediaAttachment = {
                name: msg.mediaName || 'midia',
                type: mimeType,
                size: msg.mediaSize || 0,
                previewUrl,
                duration: msg.mediaDuration,
              };
            } catch (err) {
              console.error('Failed to decrypt media blob:', err);
            }
          }

          return {
            id: msg.id,
            threadId: msg.threadId,
            content,
            mediaType: msg.mediaType as MediaCategory | undefined,
            mediaAttachment,
            isStarred: Boolean(msg.isStarred),
            createdAt: msg.createdAt,
          };
        })
      );

      setDecryptedMessages((previous) => {
        previous.forEach((message) => {
          if (message.mediaAttachment?.previewUrl) URL.revokeObjectURL(message.mediaAttachment.previewUrl);
        });
        return decryptedList;
      });
    } catch (err) {
      console.error('Error decrypting messages:', err);
    } finally {
      setIsDecrypting(false);
    }
  }, [rawMessages, encryptionKey]);

  useEffect(() => {
    decryptAllMessages();
  }, [decryptAllMessages]);

  useEffect(() => {
    decryptedMessagesRef.current = decryptedMessages;
  }, [decryptedMessages]);

  useEffect(() => {
    return () => {
      decryptedMessagesRef.current.forEach((m) => {
        if (m.mediaAttachment?.previewUrl) {
          URL.revokeObjectURL(m.mediaAttachment.previewUrl);
        }
      });
    };
  }, []);

  const sendMessage = async (
    content: string,
    mediaFile?: { file: File; mediaType: MediaCategory; duration?: number }
  ) => {
    if (!encryptionKey || !activeThreadId) return;

    const now = Date.now();
    const messageId = `msg-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const { ciphertext, iv } = await encryptString(content, encryptionKey);

    let encryptedMedia: ArrayBuffer | undefined;
    let mediaIv: string | undefined;
    let mediaName: string | undefined;
    let mediaMimeType: string | undefined;
    let mediaSize: number | undefined;
    let mediaDuration: number | undefined;

    if (mediaFile) {
      const buffer = await mediaFile.file.arrayBuffer();
      const encrypted = await encryptArrayBuffer(buffer, encryptionKey);
      encryptedMedia = encrypted.ciphertext;
      mediaIv = encrypted.iv;
      mediaName = mediaFile.file.name || mediaFile.file.type;
      mediaMimeType = mediaFile.file.type;
      mediaSize = mediaFile.file.size;
      mediaDuration = mediaFile.duration;
    }

    const newDbMsg: DbMessage = {
      id: messageId,
      threadId: activeThreadId,
      content: ciphertext,
      iv,
      mediaType: mediaFile?.mediaType,
      encryptedMedia,
      mediaIv,
      mediaName,
      mediaMimeType,
      mediaSize,
      mediaDuration,
      isStarred: 0,
      createdAt: now,
    };

    await db.messages.add(newDbMsg);

    await db.threads.update(activeThreadId, {
      updatedAt: now,
    });
  };

  const toggleStarMessage = async (messageId: string, currentStarred: boolean) => {
    await db.messages.update(messageId, {
      isStarred: currentStarred ? 0 : 1,
    });
  };

  const deleteMessage = async (messageId: string) => {
    const deletedMessage = await db.messages.get(messageId);
    await db.messages.delete(messageId);
    return deletedMessage;
  };

  const restoreMessage = async (message: DbMessage) => {
    await db.messages.put(message);
  };

  const getAllSearchMessages = useCallback(async (): Promise<Message[]> => {
    if (!encryptionKey) return [];
    const storedMessages = await db.messages.orderBy('createdAt').reverse().toArray();
    return Promise.all(storedMessages.map(async (message) => {
      let content = '';
      try {
        content = await decryptString(message.content, message.iv, encryptionKey);
      } catch {
        content = '[Conteúdo indisponível]';
      }
      return {
        id: message.id,
        threadId: message.threadId,
        content,
        mediaType: message.mediaType,
        isStarred: Boolean(message.isStarred),
        createdAt: message.createdAt,
      };
    }));
  }, [encryptionKey]);

  const createThread = async (title: string, category: string, icon: string, color: ThreadColor) => {
    const now = Date.now();
    const id = `thread-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const newThread: DbThread = {
      id,
      title,
      category,
      icon,
      color,
      isPinned: 0,
      isFavorite: 0,
      isArchived: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.threads.add(newThread);
    setActiveThreadId(id);
    return id;
  };

  const createQuickThread = async () => {
    const existingTitles = threads.map((t) => t.title.trim().toLowerCase());

    const baseName = 'Nova Conversa';
    let finalTitle = baseName;
    let counter = 1;
    while (existingTitles.includes(finalTitle.toLowerCase())) {
      finalTitle = `${baseName} (${counter})`;
      counter++;
    }

    const id = await createThread(finalTitle, 'Geral', DEFAULT_THREAD_ICON, DEFAULT_THREAD_COLOR);
    return { id, title: finalTitle };
  };

  const updateThread = async (
    id: string,
    updates: Partial<Pick<Thread, 'title' | 'category' | 'icon' | 'color' | 'isPinned' | 'isFavorite' | 'isArchived'>>,
  ) => {
    const { isPinned, isFavorite, isArchived, ...appearanceUpdates } = updates;
    const dbUpdates: Partial<DbThread> = { ...appearanceUpdates };
    if (isPinned !== undefined) dbUpdates.isPinned = isPinned ? 1 : 0;
    if (isFavorite !== undefined) dbUpdates.isFavorite = isFavorite ? 1 : 0;
    if (isArchived !== undefined) dbUpdates.isArchived = isArchived ? 1 : 0;
    await db.threads.update(id, dbUpdates);
  };

  const clearThread = async (id: string) => {
    await db.messages.where('threadId').equals(id).delete();
  };

  const clearAllData = async () => {
    await db.transaction('rw', db.threads, db.messages, db.categories, async () => {
      await db.messages.clear();
      await db.threads.clear();
      await db.categories.clear();
      await db.categories.put({
        id: 'category-geral',
        name: 'Geral',
        color: DEFAULT_CATEGORY_COLOR,
        createdAt: Date.now(),
      });
    });

    setActiveThreadId('');
    setDecryptedMessages((previous) => {
      previous.forEach((message) => {
        if (message.mediaAttachment?.previewUrl) URL.revokeObjectURL(message.mediaAttachment.previewUrl);
      });
      return [];
    });
    try {
      localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY);
    } catch {
      // O conteúdo já foi removido mesmo quando o armazenamento do navegador está indisponível.
    }
  };

  const createCategory = async (name: string, color: PaletteColor): Promise<Category> => {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Informe um nome para a categoria.');
    const existing = categories.find(
      (category) => category.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );
    if (existing) return existing;

    const category: Category = {
      id: `category-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: normalizedName,
      color,
      createdAt: Date.now(),
    };
    await db.categories.add(category);
    return category;
  };

  const updateCategory = async (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    const isDefaultCategory = category.id === 'category-geral' || category.name.toLocaleLowerCase() === 'geral';
    const nextName = isDefaultCategory ? undefined : updates.name?.trim();
    if (!isDefaultCategory && updates.name !== undefined && !nextName) return;
    const safeUpdates = { ...updates };
    if (isDefaultCategory) delete safeUpdates.name;

    await db.transaction('rw', db.categories, db.threads, async () => {
      await db.categories.update(id, { ...safeUpdates, ...(nextName ? { name: nextName } : {}) });
      if (nextName && nextName !== category.name) {
        await db.threads.where('category').equals(category.name).modify({ category: nextName });
      }
    });
  };

  const deleteCategory = async (id: string) => {
    const category = categories.find((item) => item.id === id);
    if (!category || category.id === 'category-geral' || category.name.toLocaleLowerCase() === 'geral') return;

    await db.transaction('rw', db.categories, db.threads, async () => {
      await db.threads.where('category').equals(category.name).modify({ category: 'Geral' });
      await db.categories.delete(id);
    });
  };

  const deleteThread = async (id: string) => {
    await db.transaction('rw', db.threads, db.messages, async () => {
      await db.messages.where('threadId').equals(id).delete();
      await db.threads.delete(id);
    });
    if (activeThreadId === id) {
      const remaining = threads.filter((t) => t.id !== id);
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
      }
    }
  };

  return {
    threads,
    categories,
    activeThread,
    activeThreadId,
    setActiveThreadId,
    messages: decryptedMessages,
    allMessages: decryptedMessages,
    isDecrypting,
    sendMessage,
    toggleStarMessage,
    deleteMessage,
    restoreMessage,
    getAllSearchMessages,
    createThread,
    createQuickThread,
    updateThread,
    clearThread,
    clearAllData,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteThread,
  };
}
