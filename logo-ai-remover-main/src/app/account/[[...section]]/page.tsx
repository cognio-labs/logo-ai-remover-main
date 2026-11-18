import { AccountPanel } from "@/components/account/AccountPanel";
import { notFound } from "next/navigation";
export const metadata = { title: "Your Account | Bellix", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  if (
    section.length > 1 ||
    !["", "billing", "usage", "notifications", "payments", "jobs", "ledger"].includes(
      section[0] || "",
    )
  )
    notFound();
  return <AccountPanel section={section[0] || ""} />;
}
