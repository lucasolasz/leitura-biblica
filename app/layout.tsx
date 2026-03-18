import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leitura Bíblica EBM",
  description:
    "Acompanhe seu plano de leitura bíblica com facilidade e organização.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
