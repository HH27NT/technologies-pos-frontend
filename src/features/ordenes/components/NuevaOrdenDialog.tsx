import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMesas } from "@/features/mesas";
import { TIPOS_ORDEN } from "../constants";
import { useCrearOrden } from "../api";
import type { Orden } from "../types";

interface NuevaOrdenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con la orden recién creada (para navegar a ella). */
  onCreated: (orden: Orden) => void;
}

/**
 * Diálogo para abrir una nueva orden (M11). Elige el tipo (mesa/barra/para llevar)
 * y, si es de mesa, la mesa. Requiere caja abierta (el botón que lo abre ya se
 * deshabilita sin caja; el backend es la autoridad final).
 */
export function NuevaOrdenDialog({ open, onOpenChange, onCreated }: NuevaOrdenDialogProps) {
  const [tipoId, setTipoId] = useState(TIPOS_ORDEN[0].id);
  const [mesaId, setMesaId] = useState<number | undefined>();

  const crear = useCrearOrden();
  const mesasQuery = useMesas({ per_page: 100 });

  const tipo = TIPOS_ORDEN.find((t) => t.id === tipoId) ?? TIPOS_ORDEN[0];
  const mesas = (mesasQuery.data?.data ?? []).filter((m) => m.activa);

  const faltaMesa = tipo.requiereMesa && !mesaId;

  // Reinicia la selección al cerrar (evita setState en efecto: se resetea aquí).
  function handleOpenChange(next: boolean) {
    if (!next) {
      setTipoId(TIPOS_ORDEN[0].id);
      setMesaId(undefined);
    }
    onOpenChange(next);
  }

  function confirmar() {
    crear.mutate(
      { id_tipo_orden: tipoId, id_mesa: tipo.requiereMesa ? mesaId : undefined },
      {
        onSuccess: (orden) => {
          handleOpenChange(false);
          onCreated(orden);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva orden</DialogTitle>
          <DialogDescription>Elige el tipo de orden para comenzar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="text-sm text-text-secondary">Tipo</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TIPOS_ORDEN.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoId(t.id)}
                  className={cn(
                    "min-h-tap rounded-lg border px-3 text-sm font-medium transition-colors",
                    tipoId === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-text-secondary hover:bg-surface-2",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tipo.requiereMesa && (
            <div>
              <span className="text-sm text-text-secondary">Mesa</span>
              <Select
                value={mesaId ? String(mesaId) : ""}
                onValueChange={(v) => setMesaId(Number(v))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona una mesa" />
                </SelectTrigger>
                <SelectContent>
                  {mesas.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nombre ?? `Mesa ${m.numero}`}
                      {m.zona ? ` · ${m.zona}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={crear.isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={crear.isPending || faltaMesa}>
            {crear.isPending ? "Creando…" : "Crear orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
