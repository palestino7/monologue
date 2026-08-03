import JSZip from 'jszip';
import { db, normalizeDefaultCategoryRecords, type DbCategory, type DbMessage, type DbThread } from '../db/database';
import { DEFAULT_CATEGORY_COLOR, THREAD_COLORS } from '../constants/threadAppearance';
import type { Message, PaletteColor, Thread } from '../types';
import {
  base64ToBuffer,
  bufferToBase64,
  decryptBackupPayload,
  encryptBackupPayload,
  type EncryptedBackupEnvelope,
} from '../crypto/encryption';

interface BackupArchive {
  version: 2 | 3 | 4;
  exportedAt: number;
  threads: DbThread[];
  messages: Array<Omit<DbMessage, 'encryptedMedia'> & { encryptedMedia?: string }>;
  categories?: DbCategory[];
}

export interface BackupFile {
  blob: Blob;
  filename: string;
}

export async function createEncryptedBackup(password: string): Promise<BackupFile> {
  const [threads, messages, categories] = await Promise.all([
    db.threads.toArray(),
    db.messages.toArray(),
    db.categories.toArray(),
  ]);
  const archive: BackupArchive = {
    version: 4,
    exportedAt: Date.now(),
    threads,
    messages: messages.map(({ encryptedMedia, ...message }) => ({
      ...message,
      encryptedMedia: encryptedMedia ? bufferToBase64(encryptedMedia) : undefined,
    })),
    categories,
  };
  const envelope = await encryptBackupPayload(JSON.stringify(archive), password);

  return {
    blob: new Blob([JSON.stringify(envelope)], { type: 'application/x-monologue' }),
    filename: `monologue-${new Date().toISOString().slice(0, 10)}.monologue`,
  };
}

export async function restoreEncryptedBackup(file: File, password: string): Promise<void> {
  const envelope = JSON.parse(await file.text()) as EncryptedBackupEnvelope;
  const archive = JSON.parse(await decryptBackupPayload(envelope, password)) as BackupArchive;

  if (![2, 3, 4].includes(archive.version) || !Array.isArray(archive.threads) || !Array.isArray(archive.messages)) {
    throw new Error('Conteúdo do backup inválido.');
  }

  const messages: DbMessage[] = archive.messages.map(({ encryptedMedia, ...message }) => ({
    ...message,
    encryptedMedia: encryptedMedia ? base64ToBuffer(encryptedMedia) : undefined,
  }));

  const importedCategories = archive.categories?.length
    ? archive.categories.map((category, index) => ({ ...category, color: THREAD_COLORS[index % THREAD_COLORS.length] as PaletteColor }))
    : [{ id: 'category-geral', name: 'Geral', color: DEFAULT_CATEGORY_COLOR, createdAt: Date.now() }];
  const normalized = normalizeDefaultCategoryRecords(importedCategories, archive.threads);

  await db.transaction('rw', db.threads, db.messages, db.categories, async () => {
    await Promise.all([
      db.threads.clear(),
      db.messages.clear(),
      db.categories.clear(),
    ]);
    await db.threads.bulkPut(normalized.threads.map((thread) => ({ ...thread, color: 'neutral' })));
    if (messages.length) await db.messages.bulkPut(messages);
    await db.categories.bulkPut(normalized.categories);
  });
}

function safeFilename(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'conversa';
}

function messageLine(message: Message): string {
  const timestamp = new Date(message.createdAt).toLocaleString('pt-BR');
  const media = message.mediaAttachment ? ` [${message.mediaAttachment.name}]` : '';
  return `[${timestamp}]${media}${message.content ? ` ${message.content}` : ''}`;
}

export async function createConversationExport(
  thread: Thread,
  messages: Message[],
  range?: { from?: number; to?: number },
): Promise<BackupFile> {
  const selected = messages.filter((message) => {
    if (range?.from && message.createdAt < range.from) return false;
    if (range?.to && message.createdAt > range.to) return false;
    return true;
  });
  const zip = new JSZip();
  zip.file(`${safeFilename(thread.title)}.txt`, selected.map(messageLine).join('\n\n'));

  const mediaFolder = zip.folder('midias');
  await Promise.all(selected.map(async (message, index) => {
    const attachment = message.mediaAttachment;
    if (!attachment?.previewUrl || !mediaFolder) return;
    const blob = await fetch(attachment.previewUrl).then((response) => response.blob());
    mediaFolder.file(`${String(index + 1).padStart(3, '0')}-${attachment.name}`, blob);
  }));

  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    filename: `${safeFilename(thread.title)}-${new Date().toISOString().slice(0, 10)}.zip`,
  };
}
