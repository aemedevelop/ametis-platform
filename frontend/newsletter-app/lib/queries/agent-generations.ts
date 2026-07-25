import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createAgentGeneration,
  fetchAgentGeneration,
  type CreateAgentGenerationPayload
} from "@/lib/newsletter-api";

export function useCreateAgentGeneration(projectId: string | null) {
  return useMutation({
    mutationFn: (payload: CreateAgentGenerationPayload) => {
      if (!projectId) {
        throw new Error("Project is required");
      }
      return createAgentGeneration(projectId, payload);
    }
  });
}

export function useAgentGeneration(generationId: string | null) {
  return useQuery({
    queryKey: ["newsletter", "agent", "generation", generationId],
    queryFn: () => {
      if (!generationId) {
        throw new Error("Generation id is required");
      }
      return fetchAgentGeneration(generationId);
    },
    enabled: Boolean(generationId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) {
        return 2000;
      }
      return status === "REQUESTED" || status === "RUNNING" ? 2000 : false;
    }
  });
}
