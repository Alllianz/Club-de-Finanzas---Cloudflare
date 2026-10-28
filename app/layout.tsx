import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Club de Finanzas UBA | Análisis Cuantitativo, Portafolio y Research",
  description:
    "Organización académica y profesional de estudiantes de la UBA. Portafolios de inversión cuantitativos, investigación macroeconómica, educación y comunidad financiera.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        montserrat.variable,
        monoFont.variable,
        "font-sans scroll-smooth",
      )}
    >
      <body className="min-h-screen bg-[#ffffff] font-sans text-[#334155] antialiased selection:bg-[#0062ff]/15 selection:text-[#091a36]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
