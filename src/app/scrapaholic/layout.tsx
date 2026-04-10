import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scrapaholic — Clinical Product Verification",
  description: "Compare supplements and health products with trust scoring powered by real data",
};

export default function ScrapaholicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
