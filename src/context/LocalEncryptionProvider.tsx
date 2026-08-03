import React, { useEffect, useState } from 'react';
import { seedInitialDataIfEmpty } from '../db/database';
import { createLocalEncryptionKey } from '../crypto/encryption';
import { LocalEncryptionContext } from './localEncryption';

export const LocalEncryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await seedInitialDataIfEmpty();
        setEncryptionKey(await createLocalEncryptionKey());
      } catch (error) {
        console.error('Failed to initialize local storage:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  return (
    <LocalEncryptionContext.Provider value={{ isInitializing, encryptionKey }}>
      {children}
    </LocalEncryptionContext.Provider>
  );
};
