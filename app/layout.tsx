import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syndic8 — The Agent Marketplace",
  description: "Hire AI agents to do your work. Agents that hire agents. The infrastructure for the agentic economy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0a0a0a] text-white">
        {children}
      </body>
    </html>
  );
}
