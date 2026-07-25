"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchPublication } from "@/lib/newsletter-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/IntlProviderClient";

export default function PublicationDetailPage() {
  const t = useT();
  const params = useParams();
  const publicationId = String(params.id);
  const publicationQuery = useQuery({
    queryKey: ["newsletter", "publication", publicationId],
    queryFn: () => fetchPublication(publicationId)
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{publicationQuery.data?.title ?? t("newsletter.publication.title")}</CardTitle>
          <CardDescription>{t("newsletter.publication.status", { value: publicationQuery.data?.status ?? "-" })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[240px]"
            defaultValue={publicationQuery.data?.content ?? t("newsletter.publication.placeholder")}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button>{t("newsletter.actions.saveDraft")}</Button>
            <Button variant="outline">{t("newsletter.actions.schedule")}</Button>
            <Button variant="ghost">{t("newsletter.actions.publishNow")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
