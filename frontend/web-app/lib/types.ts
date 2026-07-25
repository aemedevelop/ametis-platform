export type KpiCard = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
};

export type HealthResponse = {
  status: string;
};

export type AuthorizationCheckResult = {
  allowed: boolean;
  reasons: string[];
};
