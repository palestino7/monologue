import React, { useCallback, useRef, useState } from 'react';
import { X, Download, Upload, Sun, Moon, Monitor, Database, Palette, ArrowLeft, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { createEncryptedBackup, restoreEncryptedBackup } from '../services/backup';
import { useAnimatedClose } from '../hooks/useAnimatedVisibility';
import { useEscapeDismiss } from '../hooks/useEscapeDismiss';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { ActionDialog } from './ActionDialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllData: () => Promise<void>;
}

type SettingsSection = 'appearance' | 'data';
type PasswordFlow = 'export' | 'import' | null;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onClearAllData }) => {
  const { themeMode, setThemeMode } = useTheme();
  const [section, setSection] = useState<SettingsSection>('appearance');
  const [passwordFlow, setPasswordFlow] = useState<PasswordFlow>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetFlow = useCallback(() => {
    setPasswordFlow(null);
    setPassword('');
    setConfirmPassword('');
    setSelectedFile(null);
    setError('');
    setShowPassword(false);
    setConfirmingImport(false);
    setConfirmingReset(false);
  }, []);

  const finalizeClose = useCallback(() => {
    resetFlow();
    setSuccess('');
    onClose();
  }, [onClose, resetFlow]);
  const { closing, close: handleClose } = useAnimatedClose(finalizeClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(isOpen);

  useEscapeDismiss(handleClose, isOpen);

  if (!isOpen) return null;

  const handleExport = async () => {
    setError('');
    if (password.length < 8) return setError('Use uma senha com pelo menos 8 caracteres.');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');

    setIsWorking(true);
    try {
      const backup = await createEncryptedBackup(password);
      const url = URL.createObjectURL(backup.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backup.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      resetFlow();
      setSuccess('Backup exportado. Guarde a senha: ela não pode ser recuperada.');
    } catch (cause) {
      console.error('Backup export failed:', cause);
      setError('Não foi possível criar o backup.');
    } finally {
      setIsWorking(false);
    }
  };

  const requestImport = () => {
    setError('');
    if (!selectedFile) return setError('Selecione um arquivo .monologue.');
    if (!password) return setError('Digite a senha usada na exportação.');
    setConfirmingImport(true);
  };

  const restoreImport = async () => {
    if (!selectedFile || !password) return;
    setConfirmingImport(false);
    setIsWorking(true);
    try {
      await restoreEncryptedBackup(selectedFile, password);

      resetFlow();
      setSuccess('Backup restaurado com sucesso.');
    } catch (cause) {
      console.error('Backup import failed:', cause);
      setError(cause instanceof Error ? cause.message : 'Não foi possível restaurar o backup.');
    } finally {
      setIsWorking(false);
    }
  };

  const beginImport = () => fileInputRef.current?.click();

  const clearEverything = async () => {
    setError('');
    setIsWorking(true);
    try {
      await onClearAllData();
      setConfirmingReset(false);
      setSuccess('Todos os dados foram excluídos. O Monologue está pronto para começar novamente.');
    } catch (cause) {
      console.error('Local data reset failed:', cause);
      setError('Não foi possível excluir todos os dados. Tente novamente.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className={`modal-backdrop ${closing ? 'animate-overlay-close' : 'animate-overlay-open'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
      <div ref={dialogRef} className={`settings-dialog ${closing ? 'animate-dialog-close' : 'animate-dialog-open'}`} role="dialog" aria-modal="true" aria-label="Configurações" tabIndex={-1}>
        <aside className="settings-nav">
          <div className="settings-nav-title">Configurações</div>
          <button className={section === 'appearance' ? 'active' : ''} onClick={() => { setSection('appearance'); resetFlow(); }}>
            <Palette size={17} /> Aparência
          </button>
          <button className={section === 'data' ? 'active' : ''} onClick={() => { setSection('data'); resetFlow(); }}>
            <Database size={17} /> Dados
          </button>
        </aside>

        <section className="settings-content">
          <div className="settings-content-header">
            <div>
              <h2>{section === 'appearance' ? 'Aparência' : 'Seus dados'}</h2>
              <p>{section === 'appearance' ? 'Escolha como o Monologue aparece para você.' : 'Leve suas conversas com você sem depender de uma conta.'}</p>
            </div>
            <button className="icon-button" onClick={handleClose} aria-label="Fechar configurações"><X size={19} /></button>
          </div>

          {section === 'appearance' && (
            <div className="settings-panel">
              <div className="setting-label">Tema</div>
              <div className="theme-options">
                {[
                  { value: 'light', label: 'Claro', icon: Sun },
                  { value: 'dark', label: 'Escuro', icon: Moon },
                  { value: 'system', label: 'Sistema', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={themeMode === value ? 'selected' : ''}
                    onClick={() => setThemeMode(value as 'light' | 'dark' | 'system')}
                  >
                    <span className={`theme-preview theme-preview--${value}`}><Icon size={18} /></span>
                    <span>{label}</span>
                    {themeMode === value && <Checkmark />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === 'data' && !passwordFlow && (
            <div className="settings-panel">
              <div className="data-card">
                <div className="data-card-copy">
                  <h3>Backup do Monologue</h3>
                  <p>O arquivo inclui conversas, mensagens e anexos. Você escolherá uma senha para protegê-lo.</p>
                </div>
                <div className="data-actions">
                  <button className="primary-action" onClick={() => { setSuccess(''); setPasswordFlow('export'); }}><Download size={17} /> Exportar</button>
                  <button className="secondary-action" onClick={beginImport}><Upload size={17} /> Importar</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".monologue,application/x-monologue"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) { setSelectedFile(file); setSuccess(''); setPasswordFlow('import'); }
                      event.target.value = '';
                    }}
                  />
                </div>
              </div>
              <div className="data-danger-section">
                <div className="setting-label">Zona de perigo</div>
                <div className="data-card data-card--danger">
                  <div className="data-card-copy">
                    <h3>Limpar todos os dados</h3>
                    <p>Exclui permanentemente todas as conversas, mensagens, mídias e categorias deste dispositivo.</p>
                  </div>
                  <button className="data-reset-action" onClick={() => { setError(''); setSuccess(''); setConfirmingReset(true); }}>
                    <Trash2 size={16} />Excluir tudo
                  </button>
                </div>
              </div>
              {success && <div className="settings-success">{success}</div>}
              {error && <div className="settings-error">{error}</div>}
            </div>
          )}

          {section === 'data' && passwordFlow && (
            <div className="settings-panel password-panel">
              <button className="back-button" onClick={resetFlow}><ArrowLeft size={16} /> Voltar</button>
              <h3>{passwordFlow === 'export' ? 'Proteja seu backup' : 'Restaure seu backup'}</h3>
              <p>
                {passwordFlow === 'export'
                  ? 'Crie uma senha exclusiva. O Monologue não armazena essa senha e não poderá recuperá-la.'
                  : <>Arquivo selecionado: <strong>{selectedFile?.name}</strong></>}
              </p>
              <label>
                Senha
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={passwordFlow === 'export' ? 'Pelo menos 8 caracteres' : 'Senha do backup'}
                    autoFocus
                  />
                  <button onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {passwordFlow === 'export' && (
                <label>
                  Confirmar senha
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite novamente" />
                </label>
              )}
              {error && <div className="settings-error">{error}</div>}
              <button className="primary-action password-submit" disabled={isWorking} onClick={passwordFlow === 'export' ? handleExport : requestImport}>
                {isWorking ? 'Processando…' : passwordFlow === 'export' ? 'Criar backup' : 'Restaurar backup'}
              </button>
            </div>
          )}
        </section>
      </div>
      {confirmingImport && (
        <ActionDialog
          title="Restaurar este backup?"
          description="As conversas, mensagens e anexos atuais serão substituídos pelos dados do arquivo selecionado."
          confirmLabel="Restaurar backup"
          destructive
          onConfirm={() => void restoreImport()}
          onClose={() => setConfirmingImport(false)}
        />
      )}
      {confirmingReset && (
        <ActionDialog
          title="Excluir todos os dados?"
          description="Todas as conversas, mensagens, mídias e categorias serão removidas permanentemente deste dispositivo. Esta ação não pode ser desfeita."
          confirmLabel="Excluir tudo"
          destructive
          isWorking={isWorking}
          onConfirm={() => void clearEverything()}
          onClose={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
};

const Checkmark = () => <span className="theme-check">✓</span>;
