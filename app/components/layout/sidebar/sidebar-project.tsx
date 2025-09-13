"use client"

import { FolderPlusIcon } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DialogCreateProject } from "./dialog-create-project"
import { SidebarProjectItem } from "./sidebar-project-item"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
}

export function SidebarProject() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects")
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      return response.json()
    },
  })

  return (
    <div className="mb-5">
      <div className="flex gap-1">
        <button
          className="hover:bg-accent/80 hover:text-foreground text-primary group/new-chat relative inline-flex w-full items-center rounded-md bg-transparent px-2 py-2 text-sm transition-colors"
          type="button"
          onClick={() => setIsDialogOpen(true)}
        >
          <div className="flex items-center gap-2">
            <FolderPlusIcon size={20} />
            New project
          </div>
        </button>
      </div>

      {isLoading ? null : (
        <div className="space-y-1 mt-1">
          {projects.slice(0, 5).map((project) => (
            <SidebarProjectItem key={project.id} project={project} />
          ))}
          {projects.length > 5 && (
            <button
              className="hover:bg-accent/80 hover:text-foreground text-muted-foreground text-xs px-2 py-1 w-full text-left transition-colors"
              onClick={() => router.push('/projects')}
            >
              +{projects.length - 5} more projects...
            </button>
          )}
        </div>
      )}

      <DialogCreateProject isOpen={isDialogOpen} setIsOpen={setIsDialogOpen} />
    </div>
  )
}
