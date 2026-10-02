import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título de la confirmación, verbo primero ("Desactivar usuario"). */
  title: string;
  /** Descripción de la consecuencia. */
  description?: ReactNode;
  /** Texto del botón que confirma. Verbo primero. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo destructivo para acciones peligrosas (borrar, anular). */
  destructive?: boolean;
  /** Deshabilita el botón y muestra estado mientras corre la mutación. */
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * Diálogo de confirmación reutilizable para acciones sensibles (desactivar,
 * anular, borrar). La página controla `open` y pasa la mutación en `onConfirm`.
 * No cierra solo: la página cierra al terminar (onSuccess) para poder mostrar error.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
