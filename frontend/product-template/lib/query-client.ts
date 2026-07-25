import { QueryClient } from "@tanstack/react-query";

export function buildQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false
      }
    }
  });
}
