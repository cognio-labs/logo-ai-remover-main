import type { Metadata } from "next";
import AboutPage from "@/routes/about";

export const metadata: Metadata = {
  title: "About Bellix.us — AI Creative Studio for Creators",
  description:
    "Bellix.us is an AI creative studio built to help creators, developers, and businesses clean, restore, and enhance their media. Learn about our tools and values.",
};

export default function Page() {
  return <AboutPage />;
}

