import {PWAProvider} from "../components/PWA";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ConfirmDialogHost } from "../components/ConfirmDialog";
import { I18nProvider } from "../components/I18n";
import { NotificationProvider } from "../components/Toast";
import "../index.css";

// Inter variable — latin-ext Türkçe (ğ, ş, İ, ı, ç, ö, ü) için şart.
// Tasarım sistemi ağırlıkları (485 book / 535 medium) variable fonttan interpolasyonla gelir.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});
export const metadata: Metadata = {
  title: "INTERACTIVEOTEL",
  description: "Otel, tesis ve oda yönetimi",
  manifest:"/manifest.webmanifest",
  appleWebApp:{capable:true,title:"INTERACTIVEOTEL",statusBarStyle:"default"},
  icons:{apple:"/pwa/apple-touch-icon.png",icon:"/pwa/icon-192.png"},
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>
        <I18nProvider>
          <NotificationProvider>
          <PWAProvider>{children}</PWAProvider>
          <ConfirmDialogHost />
          </NotificationProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
