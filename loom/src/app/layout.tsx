import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/Providers";
import type { Locale } from "@/lib/i18n/translations";

export const metadata: Metadata = {
  title: "Loom - Turn Threads into PDF",
  description:
    "Convert any Threads profile into a beautiful, downloadable PDF. Create your own book from your Threads posts.",
  icons: {
    icon: "/icon-white.png",
    apple: "/icon-white.png",
  },
  openGraph: {
    title: "Loom - Turn Threads into PDF",
    description:
      "Convert any Threads profile into a beautiful, downloadable PDF.",
    type: "website",
    images: ["/icon-white.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale: Locale = localeCookie === "en" ? "en" : "ko";

  return (
    <html lang={locale}>
      <body className="antialiased font-sans">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
