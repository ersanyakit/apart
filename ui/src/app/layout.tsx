import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConfirmDialogHost } from "../components/ConfirmDialog";
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
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>
        {children}
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
