import type { Metadata } from "next";
import SunshowerLanding from "./SunshowerLanding";

export const metadata: Metadata = {
  title: "sunshower",
  description:
    "A native California pollinator garden, in progress. Right plant, right place.",
};

export default function SunshowerPage() {
  return <SunshowerLanding />;
}
