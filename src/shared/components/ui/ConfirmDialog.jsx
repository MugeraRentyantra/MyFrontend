import { useId, useRef } from 'react';
import { AlertTriangle, HelpCircle } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Confirmation step before risky actions (KD2). `onConfirm` may be async; the dialog does not
 * close itself — close it from the caller once the action succeeds.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  confirmDisabled = false,
  children,
}) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const titleId = useId();
  const messageId = useId();
  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  const handleClose = () => {
    if (!loading) onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      hideCloseButton
      initialFocusRef={isDanger ? cancelRef : confirmRef}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      role="alertdialog"
      footer={
        <>
          <Button ref={cancelRef} variant="outline" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={isDanger ? 'danger' : 'primary'}
            onClick={() => onConfirm?.()}
            loading={loading}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            isDanger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {message ? (
            <div id={messageId} className="mt-1.5 text-sm text-slate-600">
              {message}
            </div>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
