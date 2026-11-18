import { admin } from "@/lib/server/bellix";
import { AdminLogin } from "@/components/account/AdminLogin";
import "@/components/account/admin.css";
export const metadata = { title: "Bellix Administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await admin();
  } catch (e) {
    return <AdminLogin />;
  }
  return children;
}
