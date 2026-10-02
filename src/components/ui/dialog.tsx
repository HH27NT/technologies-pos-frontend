import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModoTema } from "@/lib/tema";

/**
 * Diálogo modal (shadcn/ui, estilo new-york) sobre tokens del Bar POS.
 * Base de ConfirmDialog y de los formularios en modal (alta/edición).
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // El portal cuelga de `document.body`, fuera del contenedor con `data-mode` del POS: sin
  // esto el diálogo resuelve los tokens claros y sale en blanco sobre la pantalla oscura.
  const modo = useModoTema();

  return (
  <DialogPortal>
    <DialogOverlay data-mode={modo} />
    <DialogPrimitive.Content
      ref={ref}
      data-mode={modo}
      className={cn(
        // `text-foreground` es obligatorio, no decorativo: `data-mode` redefine las variables,
        // pero el color heredado del `body` viene ya resuelto en claro. Sin esto, todo lo que no
        // declara color propio —la variante `outline` del botón, por ejemplo— sale negro sobre
        // negro. `select` y `dropdown-menu` ya lo fijaban.
        "fixed left-1/2 top-1/2 z-50 grid -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-card text-foreground shadow-md rounded-lg",
          // Ancho: deja margen a los lados en vez de pegarse a los bordes del teléfono.
          "w-[calc(100%-2rem)] max-w-lg",
          // Alto: sin esto, un formulario más alto que la pantalla se sale por abajo y su
          // botón de guardar queda fuera de alcance — en un teléfono eso es la mayoría de
          // los formularios. `dvh` y no `vh` porque la barra del navegador móvil aparece y
          // desaparece, y `vh` mide la ventana más grande, no la visible.
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          // 24px de padding por lado se comen el ancho útil en pantallas angostas.
          "p-4 sm:p-6",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm text-text-muted opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none"
        aria-label="Cerrar"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
  );
}
DialogHeader.displayName = "DialogHeader";

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
