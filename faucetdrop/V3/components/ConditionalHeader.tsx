"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function ConditionalHeader() {
  const pathname = usePathname();

  // Hide the header on all /blog routes
  if (pathname?.startsWith("/blog")) {
    return null;
  }

  return <Header />;
}