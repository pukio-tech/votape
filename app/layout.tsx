import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { obtenerAjustes } from "@/lib/ajustes";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { nombrePlataforma } = await obtenerAjustes();
  return {
    title: { default: nombrePlataforma, template: `%s · ${nombrePlataforma}` },
    description: "Sistema de votación electoral con voto único y secreto.",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f3a6e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
