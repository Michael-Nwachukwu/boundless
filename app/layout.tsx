import type React from "react"
import type { Metadata } from "next"
import { Geist_Mono as GeistMono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const geistMono = GeistMono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Boundless | Multichain Liquidity Orchestration",
  description: "Your capital, without boundaries. Unified balance management across multiple chains and wallets.",
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: "Boundless | Multichain Liquidity Orchestration",
    description: "Your capital, without boundaries. Unified balance management across multiple chains and wallets.",
    images: ['/logo.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Boundless | Multichain Liquidity Orchestration",
    description: "Your capital, without boundaries. Unified balance management across multiple chains and wallets.",
    images: ['/logo.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistMono.className} bg-black text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
