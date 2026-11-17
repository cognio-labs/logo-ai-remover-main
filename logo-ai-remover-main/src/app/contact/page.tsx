import { pageMetadata } from "@/lib/seo";
import ContactPage from "@/routes/contact";

export const metadata = pageMetadata(
  "/contact",
  "Contact Bellix Support",
  "Contact Bellix with questions about image and video editing tools. Include the tool name and a description of the issue.",
  true,
);

export default function Page() {
  return <ContactPage />;
}
