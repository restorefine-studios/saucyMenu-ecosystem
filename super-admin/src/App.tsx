import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routes } from "./routes";
import { InstallPrompt } from "@/components/InstallPrompt";

import "./index.css";

function App() {
  const queryClient = new QueryClient();
  const router = createBrowserRouter(routes);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <InstallPrompt />
      </QueryClientProvider>
    </>
  );
}

export default App;
