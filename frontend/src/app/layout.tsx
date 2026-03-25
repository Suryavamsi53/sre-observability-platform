import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRE Platform Dashboard",
  description: "Real-time Site Reliability Engineering Telemetry",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
