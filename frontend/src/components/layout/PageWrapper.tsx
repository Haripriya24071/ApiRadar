import React from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

interface PageWrapperProps {
  children: React.ReactNode
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="h-screen w-screen flex bg-background text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
