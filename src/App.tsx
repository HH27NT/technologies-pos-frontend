import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { ErrorBoundaryApp } from "./app/ErrorBoundaryApp";
import { router } from "./app/router";

export default function App() {
  return (
    <ErrorBoundaryApp>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundaryApp>
  );
}
