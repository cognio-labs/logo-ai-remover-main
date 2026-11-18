import { PaymentStatusPanel } from "@/components/account/CheckoutPanel";
export const metadata = { title: "Payment status", robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; contract?: string }>;
}) {
  const query = await searchParams;
  return <PaymentStatusPanel orderId={query.order} contractId={query.contract} />;
}
