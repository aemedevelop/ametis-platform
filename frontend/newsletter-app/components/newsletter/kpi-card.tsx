import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardDescription>{title}</CardDescription>
      <CardTitle className="mt-2 text-2xl text-[#163c79]">{value}</CardTitle>
      <p className="mt-2 text-xs text-[#6d81a1]">{hint}</p>
    </Card>
  );
}
