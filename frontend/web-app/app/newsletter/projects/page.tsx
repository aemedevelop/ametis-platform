"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "@/lib/newsletter-api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/newsletter/empty-state";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/IntlProviderClient";

export default function NewsletterProjectsPage() {
  const t = useT();
  const { data, isLoading, isError } = useQuery({ queryKey: ["newsletter", "projects"], queryFn: fetchProjects });

  if (isLoading) {
    return <Card><CardContent>{t("newsletter.loading.projects")}</CardContent></Card>;
  }

  if (isError || !data || data.length === 0) {
    return (
      <EmptyState
        title={t("newsletter.projects.empty.title")}
        description={t("newsletter.projects.empty.subtitle")}
        actionLabel={t("newsletter.actions.newProject")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("newsletter.projects.title")}</CardTitle>
            <CardDescription>{t("newsletter.projects.subtitle")}</CardDescription>
          </div>
          <Button>{t("newsletter.actions.newProject")}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((project) => (
            <Link key={project.id} href={`/newsletter/projects/${project.id}`} className="panel rounded-xl p-4 transition hover:border-brand-300/50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{project.name}</h3>
                  <p className="text-xs text-slate-400">{project.description ?? t("newsletter.common.noDescription")}</p>
                </div>
                <Badge>{project.status}</Badge>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {t("newsletter.projects.meta", { language: project.language, tone: project.tone })}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
