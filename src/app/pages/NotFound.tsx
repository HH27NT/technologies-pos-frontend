import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="text-center">
        <h1 className="font-display text-3xl">404</h1>
        <p className="mt-2 text-text-secondary">Esta página no existe.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-brand-accent underline-offset-4 hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
