import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardDescription>{title}</CardDescription>
      <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </Card>
  );
}