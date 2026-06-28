import { Suspense } from "react"
import { InventoryApp } from "@/components/inventory/inventory-app"

export default function Home() {
  return (
    <Suspense fallback={null}>
      <InventoryApp />
    </Suspense>
  )
}
