import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AreaCare — Trash pickup on request", template: "%s · AreaCare" },
  description:
    "Register your home with AreaCare, tap “Trash filled” when your bin is full, and a crew comes to collect it.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#14231C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !font-sans !shadow-lift",
            },
          }}
        />
      </body>
    </html>
  );
}
