"use client"

import { Header } from "@/app/components/layout/header"
import { AppSidebar } from "@/app/components/layout/sidebar/app-sidebar"
import { GlobalNav } from "@/components/ui/global-nav"
import { useUserPreferences } from "@/lib/user-preference-store/provider"

export function LayoutApp({ children }: { children: React.ReactNode }) {
  const { preferences } = useUserPreferences()
  const hasSidebar = preferences.layout === "sidebar"

  return (
    <div
      className="bg-background flex h-dvh w-full overflow-hidden"
      style={hasSidebar ? {
        "--sidebar-left-offset": "80px"
      } as React.CSSProperties : {}}
    >
      <GlobalNav />
      {hasSidebar && <AppSidebar />}
      <main className="@container relative h-dvh w-0 flex-shrink flex-grow overflow-y-auto">
        <Header hasSidebar={hasSidebar} />
        {children}
      </main>
    </div>
  )
}
