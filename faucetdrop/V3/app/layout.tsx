import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FaucetDrops",
  description: "FaucetDrops - Get test tokens for your development needs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
      >
        <SplashScreen />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
