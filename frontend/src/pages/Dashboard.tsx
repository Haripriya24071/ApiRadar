import React from 'react'
import { Outlet } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'

export default function Dashboard() {
  return (
    <PageWrapper>
      <Outlet />
    </PageWrapper>
  )
}
