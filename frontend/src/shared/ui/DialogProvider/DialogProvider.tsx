import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import './DialogProvider.css';

export type ShowAlertOptions = {
  title?: string;
};

export type ShowConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

export type ShowPromptOptions = {
  title?: string;
  label?: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
  placeholder?: string;
  submitText?: string;
};

export type DialogsApi = {
  showAlert: (message: string, options?: ShowAlertOptions) => Promise<void>;
  showConfirm: (message: string, options?: ShowConfirmOptions) => Promise<boolean>;
  showPrompt: (options: ShowPromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogsApi | null>(null);

type DialogState =
  | {
      kind: 'alert';
      title: string;
      message: string;
      close: () => void;
    }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
      danger: boolean;
      close: (confirmed: boolean) => void;
    }
  | {
      kind: 'prompt';
      title: string;
      label?: string;
      defaultValue: string;
      multiline: boolean;
      minLength?: number;
      placeholder?: string;
      submitText: string;
      cancelText: string;
      close: (value: string | null) => void;
    };

const PROMPT_INPUT_SELECTOR = '[data-dialog-prompt-input]';

const PromptBody: React.FC<{
  multiline: boolean;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  onSubmit: () => void;
}> = ({ multiline, label, placeholder, value, onChange, error, onSubmit }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  if (multiline) {
    return (
      <div className="dialog-prompt-field">
        {label && <label className="dialog-prompt-label">{label}</label>}
        <div className={`dialog-prompt-textarea-wrap ${error ? 'dialog-prompt-textarea-wrap--error' : ''}`}>
          <textarea
            data-dialog-prompt-input
            className="dialog-prompt-textarea"
            value={value}
            placeholder={placeholder}
            rows={4}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {error && <span className="dialog-prompt-error">{error}</span>}
      </div>
    );
  }

  return (
    <Input
      data-dialog-prompt-input
      label={label}
      error={error || undefined}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const settledRef = useRef(false);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState('');

  const settle = useCallback((fn: () => void) => {
    if (settledRef.current) return;
    settledRef.current = true;
    try {
      fn();
    } finally {
      settledRef.current = false;
      setDialog(null);
      setPromptError('');
      setPromptValue('');
    }
  }, []);

  const showAlert = useCallback((message: string, options?: ShowAlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: 'alert',
        title: options?.title ?? 'Сообщение',
        message,
        close: () => settle(() => resolve()),
      });
    });
  }, [settle]);

  const showConfirm = useCallback((message: string, options?: ShowConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const danger = options?.danger ?? false;
      setDialog({
        kind: 'confirm',
        title: options?.title ?? 'Подтверждение',
        message,
        confirmText: options?.confirmText ?? (danger ? 'Удалить' : 'ОК'),
        cancelText: options?.cancelText ?? 'Отмена',
        danger,
        close: (confirmed) => settle(() => resolve(confirmed)),
      });
    });
  }, [settle]);

  const showPrompt = useCallback((options: ShowPromptOptions) => {
    return new Promise<string | null>((resolve) => {
      const defaultValue = options.defaultValue ?? '';
      setDialog({
        kind: 'prompt',
        title: options.title ?? 'Ввод',
        label: options.label,
        defaultValue,
        multiline: options.multiline ?? false,
        minLength: options.minLength,
        placeholder: options.placeholder,
        submitText: options.submitText ?? 'ОК',
        cancelText: 'Отмена',
        close: (value) => settle(() => resolve(value)),
      });
    });
  }, [settle]);

  const api = useMemo<DialogsApi>(
    () => ({ showAlert, showConfirm, showPrompt }),
    [showAlert, showConfirm, showPrompt],
  );

  useEffect(() => {
    if (dialog?.kind === 'prompt') {
      setPromptValue(dialog.defaultValue);
      setPromptError('');
      const t = window.setTimeout(() => {
        document.querySelector<HTMLElement>(PROMPT_INPUT_SELECTOR)?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [dialog]);

  const handleModalClose = () => {
    if (!dialog) return;
    if (dialog.kind === 'alert') dialog.close();
    else if (dialog.kind === 'confirm') dialog.close(false);
    else dialog.close(null);
  };

  const handlePromptSubmit = () => {
    if (dialog?.kind !== 'prompt') return;
    const trimmed = promptValue.trim();
    if (dialog.minLength != null && trimmed.length < dialog.minLength) {
      setPromptError(`Минимум ${dialog.minLength} символов`);
      return;
    }
    dialog.close(trimmed);
  };

  const footer =
    dialog?.kind === 'alert' ? (
      <Button onClick={() => dialog.close()}>ОК</Button>
    ) : dialog?.kind === 'confirm' ? (
      <>
        <Button variant="secondary" onClick={() => dialog.close(false)}>
          {dialog.cancelText}
        </Button>
        <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => dialog.close(true)}>
          {dialog.confirmText}
        </Button>
      </>
    ) : dialog?.kind === 'prompt' ? (
      <>
        <Button variant="secondary" onClick={() => dialog.close(null)}>
          {dialog.cancelText}
        </Button>
        <Button onClick={handlePromptSubmit}>{dialog.submitText}</Button>
      </>
    ) : null;

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && (
        <Modal
          isOpen
          onClose={handleModalClose}
          title={dialog.title}
          footer={footer}
          size={dialog.kind === 'prompt' && dialog.multiline ? 'medium' : 'small'}
          closeOnClickOutside
        >
          {dialog.kind === 'alert' && <p className="dialog-message">{dialog.message}</p>}
          {dialog.kind === 'confirm' && <p className="dialog-message">{dialog.message}</p>}
          {dialog.kind === 'prompt' && (
            <PromptBody
              multiline={dialog.multiline}
              label={dialog.label}
              placeholder={dialog.placeholder}
              value={promptValue}
              onChange={(v) => {
                setPromptError('');
                setPromptValue(v);
              }}
              error={promptError}
              onSubmit={handlePromptSubmit}
            />
          )}
        </Modal>
      )}
    </DialogContext.Provider>
  );
};

export function useDialogs(): DialogsApi {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialogs must be used within DialogProvider');
  }
  return ctx;
}
