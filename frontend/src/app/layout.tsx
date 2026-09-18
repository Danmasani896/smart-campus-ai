import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Smart Campus · Bayero University Kano",
    template: "%s · Smart Campus",
  },
  description:
    "Your BUK campus companion. Find answers, explore Old and New Campuses, and feel at home.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
