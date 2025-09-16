"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fetchClient } from "@/lib/fetch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"

type DialogCreateProjectProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

type CreateProjectData = {
  id: string
  name: string
  user_id: string
  created_at: string
  description: string | null
}

type CreateProjectPayload = {
  name: string
  description: string | null
}

export function DialogCreateProject({
  isOpen,
  setIsOpen,
}: DialogCreateProjectProps) {
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const queryClient = useQueryClient()
  const router = useRouter()
  const createProjectMutation = useMutation({
    mutationFn: async ({
      name,
      description,
    }: CreateProjectPayload): Promise<CreateProjectData> => {
      const response = await fetchClient("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      router.push(`/p/${data.id}`)
      setProjectName("")
      setProjectDescription("")
      setIsOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectName.trim()) {
      createProjectMutation.mutate({
        name: projectName.trim(),
        description: projectDescription.trim() || null,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter details for your new project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Project description</Label>
              <Textarea
                id="project-description"
                placeholder="Project description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!projectName.trim() || createProjectMutation.isPending}
            >
              {createProjectMutation.isPending
                ? "Creating..."
                : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
