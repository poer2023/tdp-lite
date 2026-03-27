import { RouteTransitionFrame } from "@/components/route-transition/RouteTransitionFrame";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteTransitionFrame>{children}</RouteTransitionFrame>;
}
