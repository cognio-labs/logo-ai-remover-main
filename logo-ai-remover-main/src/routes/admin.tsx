"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminDisabled,
});

export default function AdminDisabled() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);

  return null;
}
