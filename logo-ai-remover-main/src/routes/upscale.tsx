import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/upscale")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
