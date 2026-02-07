'use client'

import { CreateFlowProvider } from '@/components/create/CreateFlowProvider'
import { UsernameLayout } from '@/components/create/layouts/UsernameLayout'
import { SelectLayout } from '@/components/create/layouts/SelectLayout'
import { CompleteLayout } from '@/components/create/layouts/CompleteLayout'

export default function CreatePage() {
  return (
    <CreateFlowProvider>
      <UsernameLayout />
      <SelectLayout />
      <CompleteLayout />
    </CreateFlowProvider>
  )
}
