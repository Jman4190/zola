"use client"

import { UserMenu } from "@/app/components/layout/user-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { House, Folder, Lightbulb, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigationItems = [
  {
    name: "Home",
    href: "/",
    icon: House,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Folder,
  },
  {
    name: "Ideas",
    href: "/ideas",
    icon: Lightbulb,
  },
  {
    name: "Pros",
    href: "/pros",
    icon: Users,
  },
]

export function GlobalNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const hasSidebar = preferences.layout === "sidebar"

  return (
    <nav className="bg-black border-border/40 fixed inset-y-0 left-0 z-20 hidden w-20 flex-col border-r md:flex">
      <div className="flex h-full flex-col items-center justify-between py-4">
        <div className="flex flex-col gap-3">
          {hasSidebar && (
            <SidebarTrigger className="flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white" />
          )}

          {navigationItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/c/")
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-lg transition-colors",
                  "hover:bg-white/10 hover:text-white",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70"
                )}
                title={item.name}
              >
                <item.icon className="size-4" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {user && (
          <div className="flex flex-col items-center">
            <div className="rounded-lg transition-colors hover:bg-white/10">
              <UserMenu compact />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}