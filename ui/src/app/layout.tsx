import type { Metadata } from "next";
import { ConfirmDialogHost } from "../components/ConfirmDialog";
import "../index.css";
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
    <html lang="tr">
      <body>
        {children}
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
