"use client"

import { UserMenu } from "@/app/components/layout/user-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
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

  return (
    <nav className="bg-background border-border/40 fixed inset-y-0 left-0 z-20 hidden w-16 flex-col border-r md:flex">
      <div className="flex h-full flex-col items-center justify-between py-4">
        <div className="flex flex-col gap-1">
          <SidebarTrigger className="size-12 text-muted-foreground hover:text-accent-foreground" />

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
                  "flex size-12 items-center justify-center rounded-lg transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
                title={item.name}
              >
                <item.icon className="size-5" />
                <span className="sr-only">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {user && (
          <UserMenu compact />
        )}
      </div>
    </nav>
  )
}