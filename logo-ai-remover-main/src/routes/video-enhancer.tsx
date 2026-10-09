import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/video-enhancer")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
