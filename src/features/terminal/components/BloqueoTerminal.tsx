import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/types";
import { useLogout } from "@/features/auth";
import { useIdentificarMesero } from "../api";
import { TecladoPin } from "./TecladoPin";

const LARGO_PIN = 6;

/**
 * Pantalla de bloqueo del POS en terminal compartida: cubre la aplicación hasta que
 * alguien se identifica con su PIN.
 *
 * Es una **capa encima**, no un reemplazo del contenido: el árbol del POS sigue montado
 * detrás, así que las órdenes abiertas, el ticket a medio armar y el scroll siguen ahí
 * cuando la terminal se desbloquea. Si sustituyéramos el contenido, cada bloqueo por
 * inactividad tiraría el trabajo del turno.
 */
export function BloqueoTerminal() {
  const [pin, setPin] = useState("");
  const identificar = useIdentificarMesero();
  const logout = useLogout();
  const navigate = useNavigate();

  function cerrarSesion() {
    logout.mutate(undefined, { onSettled: () => navigate("/", { replace: true }) });
  }

  // Al completar los 6 dígitos se envía solo: en la barra nadie quiere buscar un botón
  // "entrar" con las manos ocupadas. Va en el manejador y NO en un efecto: un efecto
  // que dependa del objeto de la mutación se re-dispara en cada render (y puede mandar
  // el PIN dos veces antes de que `isPending` se ponga en true).
  function alTeclear(nuevo: string) {
    setPin(nuevo);
    if (nuevo.length === LARGO_PIN && !identificar.isPending) {
      identificar.mutate(nuevo, { onSettled: () => setPin("") });
    }
  }

  const error = identificar.error
    ? isApiError(identificar.error)
      ? identificar.error.message
      : "No se pudo verificar el PIN"
    : undefined;

  return (
    <div
      // El POS ya vive en tema oscuro; esta capa lo refuerza para que se lea como
      // "la terminal está cerrada", no como un diálogo más.
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Terminal bloqueada"
    >
      <Lock className="size-8 text-text-muted" />
      <h1 className="mt-4 font-display text-2xl">Terminal bloqueada</h1>
      <p className="mt-1 max-w-xs text-center text-sm text-text-secondary">
        Teclea tu PIN de mesero para que las ventas queden a tu nombre.
      </p>

      <div className="mt-8 flex flex-col items-center">
        <TecladoPin valor={pin} onChange={alTeclear} disabled={identificar.isPending} />

        <p
          role={error ? "alert" : undefined}
          className="mt-6 h-5 text-sm text-danger"
          aria-live="polite"
        >
          {identificar.isPending ? "" : error}
        </p>
      </div>

      {/* Salida de emergencia: la capa tapa la cabecera entera, así que sin esto una
          tablet cuyo personal no recuerde su PIN se queda muerta, sin manera siquiera
          de cerrar la sesión y entrar con otra cuenta. */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-6 text-text-muted"
        onClick={cerrarSesion}
        disabled={logout.isPending}
      >
        <LogOut />
        Cerrar sesión de la terminal
      </Button>
    </div>
  );
}
