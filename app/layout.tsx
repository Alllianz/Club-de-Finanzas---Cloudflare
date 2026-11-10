import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
      className="font-sans scroll-smooth max-w-[100vw] overflow-x-hidden"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#ffffff] font-sans text-[#334155] antialiased selection:bg-[#0b1727]/10 selection:text-[#0b1727]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
