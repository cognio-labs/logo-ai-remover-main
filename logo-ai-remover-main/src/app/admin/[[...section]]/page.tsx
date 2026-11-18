import { AdminPanel } from "@/components/account/AdminPanel";
import { notFound } from "next/navigation";
const adminSections = [
  "users",
  "contact",
  "plans",
  "trial",
  "subscriptions",
  "payments",
  "credits",
  "jobs",
  "notifications",
  "settings",
  "audit-logs",
  "tools",
  "ledger",
  "roles",
  "orders",
];
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  if (section.length > 1 || (section[0] && !adminSections.includes(section[0]))) notFound();
  return <AdminPanel section={section[0] || ""} />;
}
