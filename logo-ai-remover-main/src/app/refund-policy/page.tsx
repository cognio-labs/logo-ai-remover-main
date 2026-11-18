import { PolicyDraft } from "@/components/account/PolicyDraft";
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return <PolicyDraft kind="refund" />;
}
