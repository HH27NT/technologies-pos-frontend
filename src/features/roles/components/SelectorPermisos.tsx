import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { GrupoPermisos } from "../types";

interface SelectorPermisosProps {
  grupos: GrupoPermisos[];
  /** Permisos actualmente otorgados (nombres técnicos). */
  valor: string[];
  onChange: (permisos: string[]) => void;
  disabled?: boolean;
}

/**
 * Editor de permisos agrupado por módulo (M04). Cada permiso se presenta con su
 * etiqueta y una frase de lo que la persona PODRÁ HACER — el texto viene del backend,
 * porque quien configura un rol piensa en tareas, no en identificadores como
 * `ordenes.cobrar`.
 *
 * El atajo por grupo ("Todos"/"Ninguno") es lo que hace viable ajustar 35 permisos sin
 * 35 clics: el caso real es "dale todo el punto de venta, nada de inventario".
 */
export function SelectorPermisos({
  grupos,
  valor,
  onChange,
  disabled,
}: SelectorPermisosProps) {
  const otorgados = new Set(valor);

  function alternar(permiso: string, activo: boolean) {
    onChange(
      activo ? [...valor, permiso] : valor.filter((p) => p !== permiso),
    );
  }

  function alternarGrupo(grupo: GrupoPermisos, activar: boolean) {
    const delGrupo = grupo.permisos.map((p) => p.nombre);
    onChange(
      activar
        ? [...new Set([...valor, ...delGrupo])]
        : valor.filter((p) => !delGrupo.includes(p)),
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => {
        const total = grupo.permisos.length;
        const activos = grupo.permisos.filter((p) => otorgados.has(p.nombre)).length;
        const todos = activos === total;

        return (
          <section
            key={grupo.grupo}
            className="rounded-lg border border-border bg-surface-1"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  {grupo.etiqueta}
                </h3>
                <p className="text-xs text-text-muted tabular-nums">
                  {activos} de {total}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => alternarGrupo(grupo, !todos)}
              >
                {todos ? "Ninguno" : "Todos"}
              </Button>
            </header>

            <ul className="divide-y divide-border">
              {grupo.permisos.map((permiso) => {
                const id = `permiso-${permiso.nombre}`;
                return (
                  <li
                    key={permiso.nombre}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <label
                        htmlFor={id}
                        className="block text-sm font-medium text-foreground"
                      >
                        {permiso.etiqueta}
                      </label>
                      {permiso.descripcion && (
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {permiso.descripcion}
                        </p>
                      )}
                    </div>
                    <Switch
                      id={id}
                      checked={otorgados.has(permiso.nombre)}
                      onCheckedChange={(activo) => alternar(permiso.nombre, activo)}
                      disabled={disabled}
                      aria-label={permiso.etiqueta}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
