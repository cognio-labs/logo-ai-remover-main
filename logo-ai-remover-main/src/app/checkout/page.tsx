import { CheckoutPanel } from "@/components/account/CheckoutPanel";
export const metadata = { title: "Checkout", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  return <CheckoutPanel planId={(await searchParams).plan} />;
}
