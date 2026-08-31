import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Voice-Assisted Technical Interview Coach",
  description: "Practice real-time technical mock interviews with an adaptive AI interviewer. Zero latency, rich feedback scorecard, and personal study guides.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
