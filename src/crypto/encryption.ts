const LOCAL_KEY_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const DEFAULT_APP_SALT = 'monologue-local-privacy-salt-v1';
const BACKUP_KDF_ITERATIONS = 310000;
const AES_GCM = 'AES-GCM';

export interface EncryptedBackupEnvelope {
  format: 'monologue-backup';
  version: 2;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveLocalKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(DEFAULT_APP_SALT);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: LOCAL_KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    { name: AES_GCM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function createLocalEncryptionKey(): Promise<CryptoKey> {
  return deriveLocalKey('monologue-default-local-key-passphrase');
}

async function deriveBackupKey(password: string, salt: ArrayBuffer, iterations: number): Promise<CryptoKey> {
  const sourceKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    sourceKey,
    { name: AES_GCM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBackupPayload(payload: string, password: string): Promise<EncryptedBackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt.buffer as ArrayBuffer, BACKUP_KDF_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    key,
    new TextEncoder().encode(payload),
  );

  return {
    format: 'monologue-backup',
    version: 2,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: BACKUP_KDF_ITERATIONS,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext),
  };
}

export async function decryptBackupPayload(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
  if (envelope.format !== 'monologue-backup' || envelope.version !== 2) {
    throw new Error('Formato de backup incompatível.');
  }

  try {
    const salt = base64ToBuffer(envelope.salt);
    const iv = new Uint8Array(base64ToBuffer(envelope.iv));
    const key = await deriveBackupKey(password, salt, envelope.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: AES_GCM, iv },
      key,
      base64ToBuffer(envelope.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Senha incorreta ou arquivo de backup danificado.');
  }
}

export async function encryptString(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    key,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptString(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  try {
    const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
    const ivBuffer = base64ToBuffer(ivBase64);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: AES_GCM, iv: new Uint8Array(ivBuffer) },
      key,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    throw new Error('Falha ao descriptografar. Os dados podem estar corrompidos.');
  }
}

export async function encryptArrayBuffer(data: ArrayBuffer, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    key,
    data
  );

  return {
    ciphertext: encryptedBuffer,
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptArrayBuffer(ciphertext: ArrayBuffer, ivBase64: string, key: CryptoKey): Promise<ArrayBuffer> {
  const ivBuffer = base64ToBuffer(ivBase64);

  return crypto.subtle.decrypt(
    { name: AES_GCM, iv: new Uint8Array(ivBuffer) },
    key,
    ciphertext
  );
}
