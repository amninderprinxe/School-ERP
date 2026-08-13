import type { Metadata }   from "next";
import { Inter }           from "next/font/google";
import "./globals.css";
import { Providers }       from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Campus-X — School ERP",
  description: "Modern School Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning is required by next-themes
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Providers is typed in a way that gives a void return type in this project setup; ignore TS here */}
        {/* @ts-ignore */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}