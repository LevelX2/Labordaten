import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "./router";
import { applyColorDesign, getStoredColorDesignKey } from "../shared/theme/colorDesigns";

const queryClient = new QueryClient();

export function App() {
  useLayoutEffect(() => {
    applyColorDesign(getStoredColorDesignKey());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
