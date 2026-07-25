"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { buildQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => buildQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}