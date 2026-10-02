import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { LoginForm } from "../components/LoginForm";

/**
 * Pantalla de acceso (M01). Si la sesión ya está hidratada (token + usuario), no
 * tiene sentido mostrar el login: se entra al inicio de la app. Se espera a que
 * `usuario` esté cargado para no renderizar el shell antes que los permisos.
 */
export function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);

  if (token && usuario) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl">Bar POS</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Inicia sesión para operar tu punto de venta.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
