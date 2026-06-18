import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InstallPrompt } from "@/components/InstallPrompt";
// import Locize from "i18next-locize-backend";
// import { locizeOptions } from "./i18n";
function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });
  const router = createBrowserRouter(routes);

  // const locize = new Locize(locizeOptions);
  // locize.getLanguages((err, data) => {
  //   console.log(data);
  // });

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
