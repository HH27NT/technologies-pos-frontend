import { useState } from "react";
import { Copy, KeyRound, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
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
import { useAdministradores, useRestablecerAcceso } from "../api";
import type { EstablecimientoRecurso, RestablecerAccesoResultado } from "../types";

interface RestablecerAccesoDialogProps {
  /** Establecimiento cuyo admin se rescata; si es undefined, el diálogo está cerrado. */
  establecimiento?: EstablecimientoRecurso;
  onOpenChange: (open: boolean) => void;
}

/**
 * Rescate de acceso del admin de un bar (M02, super_admin). Dos fases:
 *  1) Elegir el administrador a restablecer (de una lista, nunca por id a mano).
 *  2) Mostrar la contraseña temporal UNA sola vez, para comunicarla fuera de banda.
 * El backend genera la temporal, revoca sesiones activas y audita la acción.
 */
export function RestablecerAccesoDialog({
  establecimiento,
  onOpenChange,
}: RestablecerAccesoDialogProps) {
  const abierto = Boolean(establecimiento);
  // Estado local sin efecto de reseteo: el padre remonta el diálogo con `key` por
  // establecimiento, así cada apertura nace con la selección y el resultado limpios.
  const [idUsuario, setIdUsuario] = useState<number | undefined>();
  const [resultado, setResultado] = useState<RestablecerAccesoResultado | null>(null);

  const adminsQuery = useAdministradores(establecimiento?.id);
  const restablecer = useRestablecerAcceso();
  const admins = adminsQuery.data ?? [];

  function confirmar() {
    if (!establecimiento || idUsuario == null) return;
    restablecer.mutate(
      { id: establecimiento.id, id_usuario: idUsuario },
      { onSuccess: (data) => setResultado(data) },
    );
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Contraseña copiada");
    } catch {
      toast.error("No se pudo copiar; cópiala manualmente.");
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restablecer acceso del administrador</DialogTitle>
          <DialogDescription>
            {resultado
              ? "Guarda o comparte esta contraseña ahora: no volverá a mostrarse."
              : `Genera una contraseña temporal para un administrador de ${establecimiento?.nombre ?? ""}.`}
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          // --- Fase 2: contraseña temporal (una sola vez) ---
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <p className="text-xs text-text-secondary">
                Administrador: <span className="text-foreground">{resultado.usuario.nombre}</span>
                {resultado.usuario.username && (
                  <span className="text-text-muted"> · {resultado.usuario.username}</span>
                )}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-md bg-surface-1 px-3 py-2 font-mono text-md text-foreground">
                  {resultado.password_temporal}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copiar contraseña"
                  onClick={() => copiar(resultado.password_temporal)}
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-text-secondary">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              Sus sesiones activas se cerraron. Recomiéndale cambiarla en cuanto entre.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Entendido
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // --- Fase 1: elegir el administrador ---
          <div className="space-y-4">
            {adminsQuery.isError ? (
              <p className="text-sm text-danger">No se pudieron cargar los administradores.</p>
            ) : admins.length === 0 && !adminsQuery.isLoading ? (
              <p className="text-sm text-text-secondary">
                Este establecimiento no tiene administradores para restablecer.
              </p>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Administrador</label>
                <Select
                  value={idUsuario != null ? String(idUsuario) : ""}
                  onValueChange={(v) => setIdUsuario(Number(v))}
                  disabled={adminsQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={adminsQuery.isLoading ? "Cargando…" : "Selecciona un administrador"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {admins.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nombre}
                        {a.username ? ` · ${a.username}` : a.email ? ` · ${a.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <p className="flex items-start gap-2 text-xs text-text-secondary">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-text-muted" />
              Se generará una contraseña temporal y se cerrarán las sesiones activas del
              administrador. La acción queda registrada en la auditoría.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={restablecer.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmar}
                disabled={idUsuario == null || restablecer.isPending}
              >
                {restablecer.isPending ? "Restableciendo…" : "Restablecer acceso"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
