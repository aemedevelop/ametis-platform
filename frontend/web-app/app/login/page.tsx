import { redirect } from "next/navigation";

export default async function LegacyLoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: target } = await searchParams;
  const destination = target
    ? `/auth/login?redirect=${encodeURIComponent(target)}`
    : "/auth/login";
  redirect(destination);
}
