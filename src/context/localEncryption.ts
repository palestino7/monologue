import { createContext, useContext } from 'react';

export interface LocalEncryptionContextValue {
  isInitializing: boolean;
  encryptionKey: CryptoKey | null;
}

export const LocalEncryptionContext = createContext<LocalEncryptionContextValue | undefined>(undefined);

export const useLocalEncryption = () => {
  const context = useContext(LocalEncryptionContext);
  if (!context) throw new Error('useLocalEncryption must be used within a LocalEncryptionProvider');
  return context;
};
