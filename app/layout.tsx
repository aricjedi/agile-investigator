import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Tab title: "TrustQ" per brand spec; full title used by social/SEO crawlers
  title: {
    default:  "TrustQ | Powered by Astris Integrity",
    template: "%s | TrustQ",
  },
  description:
    "TrustQ by Astris Integrity — real-time health monitoring for corporate investigations programs.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
