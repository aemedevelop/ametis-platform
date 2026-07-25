"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSources, fetchSourcesIncludingDeleted } from "@/lib/newsletter-api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/newsletter/empty-state";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/IntlProviderClient";

export default function NewsletterSourcesPage() {
  const t = useT();
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["newsletter", "sources", showDeleted],
    queryFn: showDeleted ? fetchSourcesIncludingDeleted : fetchSources
  });

  if (isLoading) {
    return <Card><CardContent>{t("newsletter.loading.sources")}</CardContent></Card>;
  }

  if (isError || !data || data.length === 0) {
    return (
      <EmptyState
        title={t("newsletter.sources.empty.title")}
        description={t("newsletter.sources.empty.subtitle")}
        actionLabel={t("newsletter.actions.addSource")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("newsletter.sources.title")}</CardTitle>
            <CardDescription>{t("newsletter.sources.subtitle")}</CardDescription>
          </div>
          <Button>{t("newsletter.actions.addSource")}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <label className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(event) => setShowDeleted(event.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          <span>{t("newsletter.sources.showDeleted")}</span>
        </label>
        <Table>
          <thead>
            <TableRow>
              <TableHead>{t("newsletter.sources.table.name")}</TableHead>
              <TableHead>{t("newsletter.sources.table.type")}</TableHead>
              <TableHead>{t("newsletter.sources.table.url")}</TableHead>
              <TableHead>{t("newsletter.sources.table.status")}</TableHead>
            </TableRow>
          </thead>
          <tbody>
            {data.map((source) => (
              <TableRow key={source.id}>
                <TableCell>{source.name}</TableCell>
                <TableCell>{source.type}</TableCell>
                <TableCell className="truncate">{source.url}</TableCell>
                <TableCell>
                  {source.deletedAt
                    ? t("newsletter.status.deleted")
                    : source.active
                      ? t("newsletter.status.active")
                      : t("newsletter.status.paused")}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}
