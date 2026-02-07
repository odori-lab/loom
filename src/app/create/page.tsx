import { redirect } from 'next/navigation'

export default function CreatePage() {
  redirect('/my?tab=create')
}
