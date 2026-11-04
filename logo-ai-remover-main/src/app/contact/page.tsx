import type { Metadata } from "next";
import ContactPage from "@/routes/contact";

export const metadata: Metadata = {
  title: "Contact Us — 24/7 Creator Support & Inquiries | Bellix.us",
  description:
    "Have a question, a project idea, or need help with our AI tools? Contact the Bellix.us team 24/7 at bellixus062@gmail.com. We respond within hours.",
};

export default function Page() {
  return <ContactPage />;
}

