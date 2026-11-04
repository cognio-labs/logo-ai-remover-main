import type { Metadata } from "next";
import AffiliatePage from "@/routes/affiliate";

export const metadata: Metadata = {
  title: "Affiliate & Partner Program — Bellix.us",
  description:
    "Earn 30% lifetime recurring commissions by introducing video editors, designers, and creators to Bellix.us.",
};

export default function Page() {
  return <AffiliatePage />;
}

