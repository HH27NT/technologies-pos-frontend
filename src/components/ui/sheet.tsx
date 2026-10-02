import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panel deslizante (drawer). Se apoya en Radix Dialog, igual que shadcn: hereda
 * gratis el foco atrapado, el cierre con Escape, el bloqueo de scroll del fondo y
 * el `aria-modal`. No añade dependencias — `@radix-ui/react-dialog` ya estaba.
 *
 * Su uso principal es la navegación en pantallas angostas: la barra lateral fija
 * ocupa 224px, que en un teléfono de 375px no deja sitio al contenido, así que por
 * debajo de `lg` la navegación se mueve aquí y se abre desde la topbar.
 */

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  /** Borde desde el que entra el panel. */
  side?: "left" | "right";
  /** Título accesible. Se lee con lector de pantalla; no se pinta salvo `mostrarTitulo`. */
  titulo: string;
  mostrarTitulo?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = "left", titulo, mostrarTitulo = false, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface-1 shadow-lg",
        "transition ease-in-out data-[state=open]:duration-300 data-[state=closed]:duration-200",
        side === "left"
          ? "left-0 border-r border-border data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
          : "right-0 border-l border-border data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
        className,
      )}
      {...props}
    >
      {/* Radix exige un título para no romper la accesibilidad del diálogo. */}
      <SheetPrimitive.Title className={cn(mostrarTitulo ? "px-4 pt-4 font-display text-md" : "sr-only")}>
        {titulo}
      </SheetPrimitive.Title>

      {children}

      <SheetPrimitive.Close
        className={cn(
          "absolute right-3 top-3 grid size-9 place-items-center rounded-sm text-text-secondary",
          "transition-colors hover:bg-surface-2 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <X className="size-4" />
        <span className="sr-only">Cerrar</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetOverlay, SheetPortal };
