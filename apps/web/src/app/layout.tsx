import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Centraxis — Agile Project Management",
  description: "Multi-Project, Multi-Team Agile Management Platform with AI Story Agent",
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
