"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchProject, fetchProjectPublications } from "@/lib/newsletter-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/IntlProviderClient";

export default function ProjectDetailPage() {
  const t = useT();
  const params = useParams();
  const projectId = String(params.id);

  const projectQuery = useQuery({
    queryKey: ["newsletter", "project", projectId],
    queryFn: () => fetchProject(projectId)
  });

  const publicationsQuery = useQuery({
    queryKey: ["newsletter", "project", projectId, "publications"],
    queryFn: () => fetchProjectPublications(projectId)
  });

  const projectStatusLabel = (value?: string) => {
    if (value === "DRAFT") return t("newsletter.projectStatus.draft");
    if (value === "ACTIVE") return t("newsletter.projectStatus.active");
    if (value === "ARCHIVED") return t("newsletter.projectStatus.archived");
    return value ?? "-";
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{projectQuery.data?.name ?? t("newsletter.project.title")}</CardTitle>
          <CardDescription>{projectQuery.data?.description ?? t("newsletter.project.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
            <span>{t("newsletter.project.language", { value: projectQuery.data?.language ?? "-" })}</span>
            <span>{t("newsletter.project.tone", { value: projectQuery.data?.tone ?? "-" })}</span>
            <span>{t("newsletter.project.status", { value: projectStatusLabel(projectQuery.data?.status) })}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("newsletter.publications.title")}</CardTitle>
              <CardDescription>{t("newsletter.publications.subtitle")}</CardDescription>
            </div>
            <Button>{t("newsletter.actions.newPublication")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs>
            <Tab active>{t("newsletter.publications.tab.recent")}</Tab>
            <Tab>{t("newsletter.publications.tab.scheduled")}</Tab>
            <Tab>{t("newsletter.publications.tab.published")}</Tab>
          </Tabs>
          <div className="mt-3">
            <Table>
              <thead>
                <TableRow>
                  <TableHead>{t("newsletter.publications.table.title")}</TableHead>
                  <TableHead>{t("newsletter.publications.table.status")}</TableHead>
                  <TableHead>{t("newsletter.publications.table.scheduled")}</TableHead>
                </TableRow>
              </thead>
              <tbody>
                {(publicationsQuery.data ?? []).map((publication) => (
                  <TableRow key={publication.id}>
                    <TableCell>{publication.title}</TableCell>
                    <TableCell>{publication.status}</TableCell>
                    <TableCell>{publication.scheduledAt ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
