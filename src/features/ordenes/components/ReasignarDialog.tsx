import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUsuarios } from "@/features/usuarios";
import { useReasignarOrden } from "../api";
import type { Orden } from "../types";

interface ReasignarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: Orden;
}

/**
 * Diálogo de traspaso (mesero fase 1b): reasigna el mesero atribuido a una orden abierta.
 * Solo lo abre quien tiene `ordenes.reasignar` (admin/gerente). El destino es un usuario
 * activo del establecimiento; el backend valida tenant + actividad y audita el cambio.
 */
export function ReasignarDialog({ open, onOpenChange, orden }: ReasignarDialogProps) {
  const reasignar = useReasignarOrden();
  const usuariosQuery = useUsuarios({ per_page: 100 });
  const actualId = orden.usuario?.id;
  const [idUsuario, setIdUsuario] = useState<number | undefined>(actualId);

  // Al abrir, parte del mesero actual (así el select muestra el estado real). Patrón de
  // ajuste de estado EN RENDER (no en efecto), el recomendado por React para "resetear al
  // cambiar una prop": evita el cascading render que marca el compilador.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setIdUsuario(actualId);
  }

  const activos = (usuariosQuery.data?.data ?? []).filter((u) => u.activo);
  const sinCambio = idUsuario == null || idUsuario === orden.usuario?.id;

  function confirmar() {
    if (idUsuario == null) return;
    reasignar.mutate(
      { idOrden: orden.id, idUsuario },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reasignar mesero</DialogTitle>
          <DialogDescription>
            {orden.usuario
              ? `La orden ${orden.folio} la atiende ${orden.usuario.nombre}. Elige a quién traspasarla.`
              : `Elige el mesero que atenderá la orden ${orden.folio}.`}
          </DialogDescription>
        </DialogHeader>

        <div>
          <span className="text-sm text-text-secondary">Mesero</span>
          <Select
            value={idUsuario != null ? String(idUsuario) : ""}
            onValueChange={(v) => setIdUsuario(Number(v))}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecciona un mesero" />
            </SelectTrigger>
            <SelectContent>
              {activos.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reasignar.isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={reasignar.isPending || sinCambio}>
            {reasignar.isPending ? "Reasignando…" : "Reasignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
