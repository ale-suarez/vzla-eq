import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
