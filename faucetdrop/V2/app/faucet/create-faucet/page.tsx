import { Suspense } from "react"
import CreateFaucetWizard from "@/components/CreateFaucetWizard"
import LoadingPage from "@/components/loading"

export default function CreatePage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <CreateFaucetWizard />
    </Suspense>
  )
}