import React from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

interface PageWrapperProps {
  children: React.ReactNode
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-screen w-full bg-[var(--black)] text-[var(--cream)] font-['Space_Grotesk']">
      <Sidebar />
      <Navbar />
      <main className="ml-[64px] pt-[52px] min-h-[calc(100vh-52px)]">
        {children}
      </main>
    </div>
  )
}
