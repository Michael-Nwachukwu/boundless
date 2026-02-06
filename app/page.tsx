"use client"

import { Hero } from "@/components/landing/hero"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const router = useRouter()

  return (
    <Hero
    />
  )
}
