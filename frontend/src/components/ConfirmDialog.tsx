import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// O <dialog> nativo já prende o foco, escurece o fundo e fecha no Esc.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      // Foco inicial no cancelar: a ação destrutiva não pode ser o primeiro
      // alvo de quem apenas apertou Enter.
      cancelRef.current?.focus();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      // O Esc dispara o cancel do próprio elemento, então o estado acompanha.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="dialog__body">
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>

        <div className="dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn--outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
