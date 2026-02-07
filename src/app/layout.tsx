import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: 'Loom - Turn Threads into PDF',
  description: 'Convert any Threads profile into a beautiful, downloadable PDF. Create your own book from your Threads posts.',
  icons: {
    icon: '/icon-white.png',
    apple: '/icon-white.png',
  },
  openGraph: {
    title: 'Loom - Turn Threads into PDF',
    description: 'Convert any Threads profile into a beautiful, downloadable PDF.',
    type: 'website',
    images: ['/icon-white.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased font-sans"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
