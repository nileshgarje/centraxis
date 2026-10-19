import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import "~/styles/globals.css";

export const metadata: Metadata = {
  title: "Centraxis — Agile Project Management Platform",
  description:
    "Multi-Project, Multi-Team Agile Management Platform with AI Story Agent by Centvis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body className="h-full min-h-screen text-slate-900 selection:bg-blue-500 selection:text-white">
        <SessionProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
