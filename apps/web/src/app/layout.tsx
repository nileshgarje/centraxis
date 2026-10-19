import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider, Toaster } from "@centraxis/ui";
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
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="h-full min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <TRPCReactProvider>{children}</TRPCReactProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
