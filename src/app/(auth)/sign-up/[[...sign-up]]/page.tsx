import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'

export default function Page() {
  return (
    <div className="bg-nex-bg flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/logo-icon.svg"
          alt="NexMess"
          width={40}
          height={40}
          className="rounded-xl shadow-md"
        />
        <span className="text-nex-primary text-xl font-bold tracking-tight">NexMess</span>
      </div>
      <SignUp />
    </div>
  )
}
