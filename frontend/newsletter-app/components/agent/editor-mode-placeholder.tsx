"use client";

import { useT } from "@/components/IntlProviderClient";
import { Button } from "@/components/ui/button";

export function EditorModePlaceholder() {
  const t = useT();

  return (
    <section className="panel rounded-2xl p-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#203a64]">{t("newsletter.editor.title")}</h3>
          <p className="mt-1 text-sm text-[#5a7092]">{t("newsletter.editor.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button className="whitespace-nowrap">{t("newsletter.actions.reviewDrafts")}</Button>
        </div>
      </header>
      <div className="mt-4 rounded-xl border border-[#d3deec] bg-[#f7faff] p-4 text-sm text-[#304d73]">
        {t("newsletter.editor.placeholder")}
      </div>
    </section>
  );
}
