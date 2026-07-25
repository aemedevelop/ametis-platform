import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, actionLabel }: { title: string; description: string; actionLabel: string }) {
  return (
    <div className="panel rounded-2xl p-6 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      <Button className="mt-4">{actionLabel}</Button>
    </div>
  );
}