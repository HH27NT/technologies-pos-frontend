import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { bootstrapSession, useAuthStore } from "@/lib/auth";
import { isApiError } from "@/lib/api/types";
import { loginSchema, type LoginInput } from "../schemas";
import { useLogin } from "../api";

/**
 * Formulario de acceso (M01). Al autenticar: guarda el token, hidrata la sesión
 * (permisos + estado de caja) y entra siempre al inicio de la app (`/app`), sin
 * restaurar la ruta anterior (evita aterrizar en una sección de otro usuario). Los
 * errores del backend se muestran tal cual; los de validación se mapean al campo.
 */
export function LoginForm() {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });
  const login = useLogin();
  const navigate = useNavigate();

  function onSubmit(values: LoginInput) {
    login.mutate(values, {
      onSuccess: async (data) => {
        useAuthStore.getState().setToken(data.token);
        await bootstrapSession();
        navigate("/app", { replace: true });
      },
      onError: (error) => {
        if (isApiError(error)) {
          if (error.errors) {
            for (const [campo, mensajes] of Object.entries(error.errors)) {
              if (campo === "login" || campo === "password") {
                form.setError(campo, { message: mensajes[0] });
              }
            }
          }
          toast.error(error.message);
        }
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usuario o correo</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoFocus
                  placeholder="tu usuario o correo"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          size="tap"
          disabled={login.isPending}
        >
          {login.isPending ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>
    </Form>
  );
}
