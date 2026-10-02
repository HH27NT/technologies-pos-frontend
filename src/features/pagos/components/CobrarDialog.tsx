import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputNumerico } from "@/components/shared";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import type { Orden } from "@/features/ordenes";
import { useIdentificarMesero, useModoTerminal } from "@/features/terminal/api";
import { TecladoPin } from "@/features/terminal/components/TecladoPin";
import { TIPOS_PAGO, tipoPago } from "../constants";
import { useRegistrarPago } from "../api";

interface CobrarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: Orden;
  /** Saldo pendiente inicial (del backend). El diálogo lo actualiza con cada pago. */
  saldo: number;
  /** Se llama cuando la orden queda totalmente pagada. */
  onPagada?: () => void;
}

/**
 * Diálogo de cobro (M12). Soporta pago simple y dividido: se registra un pago a la
 * vez y el saldo pendiente se toma SIEMPRE del backend (`res.saldo`, regla #6) hasta
 * llegar a 0. Efectivo admite sobre-entrega y muestra el cambio que devuelve el
 * backend; tarjeta/transferencia no pueden exceder el saldo. Exige caja abierta y
 * `ordenes.cobrar` (el botón que abre este diálogo ya lo gatea).
 *
 * El formulario vive en `CobrarContenido`, montado solo con el diálogo abierto: así
 * el estado (saldo en curso, pagos hechos) se reinicia limpio en cada apertura sin
 * necesidad de efectos.
 */
export function CobrarDialog({ open, onOpenChange, orden, saldo, onPagada }: CobrarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cobrar orden {orden.folio}</DialogTitle>
          <DialogDescription>
            Registra el pago. Puedes dividirlo en varios pagos hasta cubrir el saldo.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <CobrarContenido
            orden={orden}
            saldoInicial={saldo}
            onClose={() => onOpenChange(false)}
            onPagada={onPagada}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PagoHecho {
  tipo_pago: string;
  monto: string;
}

interface CobrarContenidoProps {
  orden: Orden;
  saldoInicial: number;
  onClose: () => void;
  onPagada?: () => void;
}

function CobrarContenido({ orden, saldoInicial, onClose, onPagada }: CobrarContenidoProps) {
  const [tipoId, setTipoId] = useState(TIPOS_PAGO[0].id);
  const [monto, setMonto] = useState<number | undefined>(saldoInicial);
  const [referencia, setReferencia] = useState("");
  const [saldoActual, setSaldoActual] = useState(saldoInicial);
  const [pagosHechos, setPagosHechos] = useState<PagoHecho[]>([]);
  const [firmando, setFirmando] = useState(false);

  const registrar = useRegistrarPago();
  const modoTerminal = useModoTerminal();
  const pidePin = modoTerminal.data?.terminal_compartida ?? false;
  const tipo = tipoPago(tipoId) ?? TIPOS_PAGO[0];

  const montoNum = monto ?? 0;
  const cambio = tipo.permiteCambio && montoNum > saldoActual ? montoNum - saldoActual : 0;
  // Tarjeta/transferencia no pueden exceder el saldo (el backend lo rechaza).
  const excede = !tipo.permiteCambio && montoNum > saldoActual + 0.001;
  const liquida = montoNum >= saldoActual; // este pago deja la orden en 0
  const dividido = pagosHechos.length > 0;

  function elegirTipo(id: number) {
    setTipoId(id);
    setReferencia("");
    setMonto(saldoActual);
  }

  function registrarPago() {
    if (!monto || monto <= 0 || excede) return;
    // En terminal compartida el PIN se pide SIEMPRE al cobrar, aunque haya un mesero
    // activo en la terminal: la sesión dice quién está usando la tablet, la firma dice
    // quién se está llevando este dinero.
    if (pidePin) {
      setFirmando(true);
      return;
    }
    enviarPago();
  }

  function enviarPago(meseroToken?: string) {
    if (!monto || monto <= 0 || excede) return;
    registrar.mutate(
      { idOrden: orden.id, id_tipo_pago: tipoId, monto, referencia, mesero_token: meseroToken },
      {
        onSuccess: (res) => {
          setPagosHechos((prev) => [
            ...prev,
            { tipo_pago: res.pago.tipo_pago, monto: res.pago.monto },
          ]);
          setSaldoActual(res.saldo);
          if (res.estado_orden === "pagada") {
            toast.success(
              res.cambio > 0 ? `Orden pagada · cambio ${formatMoney(res.cambio)}` : "Orden pagada",
            );
            // P2: la venta nunca se bloquea por falta de stock, pero si esta orden dejó
            // algún insumo en negativo se avisa aquí — es el momento en que a alguien le
            // sirve saberlo, no hasta que se revise el dashboard más tarde.
            if (res.avisos_stock.length > 0) {
              const nombres = res.avisos_stock.map((a) => a.insumo ?? "un insumo").join(", ");
              toast.warning(`Quedó sin stock suficiente: ${nombres}`, { duration: 8000 });
            }
            onPagada?.();
            onClose();
          } else {
            toast.success("Pago registrado");
            setMonto(res.saldo);
            setReferencia("");
          }
        },
      },
    );
  }

  if (firmando) {
    return (
      <FirmaCobro
        monto={montoNum}
        onCancelar={() => setFirmando(false)}
        onFirmado={(token) => {
          setFirmando(false);
          enviarPago(token);
        }}
      />
    );
  }

  return (
    <>
      {/* Saldo pendiente (del backend) */}
      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(orden.total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-display">Saldo pendiente</span>
          <span className="font-display text-2xl tabular-nums">{formatMoney(saldoActual)}</span>
        </div>
      </div>

      {/* Pagos ya registrados (dividido) */}
      {dividido && (
        <ul className="space-y-1 text-sm">
          {pagosHechos.map((p, i) => (
            <li key={i} className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 capitalize">
                <Check className="size-3.5 text-success" />
                {p.tipo_pago}
              </span>
              <span className="tabular-nums">{formatMoney(p.monto)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Tipo de pago */}
      <div>
        <span className="text-sm text-text-secondary">Tipo de pago</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TIPOS_PAGO.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => elegirTipo(t.id)}
              className={cn(
                "min-h-tap rounded-lg border px-2 text-xs font-medium transition-colors sm:text-sm",
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

      {/* Monto */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {tipo.permiteCambio ? "Monto recibido" : "Monto"}
          </span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setMonto(saldoActual)}
          >
            Saldo exacto
          </button>
        </div>
        <InputNumerico
          autoFocus
          decimales={2}
          className="mt-2 text-lg"
          placeholder="0.00"
          value={monto}
          onChange={(v) => setMonto(v ?? undefined)}
        />
        {cambio > 0 && (
          <p className="mt-1.5 flex items-center justify-between text-sm text-success">
            <span>Cambio a entregar</span>
            <span className="tabular-nums">{formatMoney(cambio)}</span>
          </p>
        )}
        {excede && (
          <p className="mt-1.5 text-sm text-danger">
            El monto no puede exceder el saldo con {tipo.label.toLowerCase()}.
          </p>
        )}
      </div>

      {/* Referencia (tarjeta/transferencia) */}
      {tipo.pideReferencia && (
        <div>
          <span className="text-sm text-text-secondary">Referencia (opcional)</span>
          <Input
            className="mt-2"
            placeholder="Autorización, folio o últimos 4 dígitos"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={registrar.isPending}>
          Cerrar
        </Button>
        <Button
          type="button"
          onClick={registrarPago}
          disabled={registrar.isPending || !montoNum || montoNum <= 0 || excede}
        >
          {registrar.isPending
            ? "Cobrando…"
            : liquida
              ? `Cobrar ${formatMoney(saldoActual)}`
              : "Registrar pago"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface FirmaCobroProps {
  monto: number;
  onCancelar: () => void;
  onFirmado: (token: string) => void;
}

/**
 * Paso de firma del cobro en terminal compartida: el PIN se teclea aquí y el token que
 * devuelve el backend viaja con ESE pago.
 *
 * `guardar: false` a propósito — firmar un cobro no desbloquea la terminal para quien
 * teclea: si el mesero de al lado firma su cuenta, la sesión abierta sigue siendo la de
 * quien estaba operando.
 */
function FirmaCobro({ monto, onCancelar, onFirmado }: FirmaCobroProps) {
  const [pin, setPin] = useState("");
  const identificar = useIdentificarMesero({ guardar: false });

  function alTeclear(nuevo: string) {
    setPin(nuevo);
    if (nuevo.length !== 6 || identificar.isPending) return;

    identificar.mutate(nuevo, {
      onSuccess: (datos) => onFirmado(datos.token),
      onError: () => setPin(""),
    });
  }

  const error = identificar.error
    ? isApiError(identificar.error)
      ? identificar.error.message
      : "No se pudo verificar el PIN"
    : undefined;

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-text-secondary">Firma el cobro de</p>
      <p className="font-display text-3xl tabular-nums">{formatMoney(monto)}</p>
      <p className="mt-1 text-center text-sm text-text-secondary">
        Teclea tu PIN para que esta venta quede a tu nombre.
      </p>

      <div className="mt-6">
        <TecladoPin valor={pin} onChange={alTeclear} disabled={identificar.isPending} />
      </div>

      <p role={error ? "alert" : undefined} className="mt-4 h-5 text-sm text-danger">
        {identificar.isPending ? "" : error}
      </p>

      <DialogFooter className="mt-2 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onCancelar}
          disabled={identificar.isPending}
        >
          Volver
        </Button>
      </DialogFooter>
    </div>
  );
}
