import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AssessmentProvider } from "@/components/assessment-provider";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Evaluación Estructural de Emergencia · Venezuela",
  description:
    "Sube fotos de tu edificio para evaluar daños estructurales tras el terremoto.",
  openGraph: {
    title: "Evaluación Estructural de Emergencia · Venezuela",
    description:
      "Sube fotos de tu estructura y recibe una evaluación orientativa de daños con IA.",
    type: "website",
    locale: "es_VE",
    siteName: "Evaluación Estructural",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evaluación Estructural de Emergencia · Venezuela",
    description:
      "Sube fotos de tu estructura y recibe una evaluación orientativa de daños con IA.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        <AssessmentProvider>
          <SiteHeader />
          {children}
        </AssessmentProvider>
      </body>
    </html>
  );
}
