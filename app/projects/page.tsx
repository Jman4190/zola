"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { useUser } from "@/lib/user-store/provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Home, Calendar, DollarSign, MapPin } from "lucide-react"
import type { BaseProject } from "@/lib/project-schemas"

interface ProjectWithCompletion extends BaseProject {
  completion: number
  template_name?: string
  chat_count?: number
}

export default function ProjectsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithCompletion[]>([])
  const [templates, setTemplates] = useState<Array<{id: string, name: string, category: string}>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }

    const fetchData = async () => {
      try {
        // Fetch projects and templates in parallel
        const [projectsResponse, templatesResponse] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/projects/templates')
        ])

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          // Calculate completion for each project
          const projectsWithCompletion = projectsData.map((project: BaseProject) => ({
            ...project,
            completion: calculateCompletion(project),
            chat_count: 0 // We'll enhance this later
          }))
          setProjects(projectsWithCompletion)
        }

        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json()
          setTemplates(templatesData.templates || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, router])

  const calculateCompletion = (project: BaseProject): number => {
    let totalFields = 0
    let completedFields = 0

    // Basic project fields (excluding start_date as it's not required)
    const basicFields = ['description', 'location', 'budget_min', 'budget_max']
    basicFields.forEach(field => {
      totalFields++
      if (project[field as keyof BaseProject] && project[field as keyof BaseProject] !== 'unknown') {
        completedFields++
      }
    })

    // Room details
    if (project.project_details && Array.isArray(project.project_details)) {
      project.project_details.forEach(room => {
        if (room.details) {
          Object.values(room.details).forEach(value => {
            totalFields++
            if (value && value !== 'unknown' && value !== '') {
              completedFields++
            }
          })
        }
      })
    }

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  const createProject = async (templateId: string, templateName: string) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `New ${templateName}`,
          template_id: templateId,
        }),
      })

      if (response.ok) {
        const newProject = await response.json()
        router.push(`/project/${newProject.id}`)
      } else {
        console.error('Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'kitchen': return '🍳'
      case 'bathroom': return '🛁'
      case 'living_room': return '🛋️'
      case 'bedroom': return '🛏️'
      case 'whole_house': return '🏠'
      case 'outdoor': return '🌳'
      default: return '🏠'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
          <p className="text-muted-foreground">Manage your home remodeling projects</p>
        </div>
      </div>

      {/* Create New Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Start New Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => createProject(template.id, template.name)}
                disabled={isCreating}
              >
                <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                <span className="text-sm font-medium">{template.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/project/${project.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>{project.status.replace('_', ' ')}</Badge>
                  </div>
                  <span className="text-2xl">{getCategoryIcon(project.template_id || 'default')}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Information Complete</span>
                    <span className="font-medium">{project.completion}%</span>
                  </div>
                  <Progress value={project.completion} className="h-2" />
                </div>

                {/* Project Details */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  {project.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{project.location}</span>
                    </div>
                  )}
                  {(project.budget_min || project.budget_max) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {project.budget_min && project.budget_max 
                          ? `${formatCurrency(project.budget_min)} - ${formatCurrency(project.budget_max)}`
                          : formatCurrency(project.budget_min || project.budget_max || 0)
                        }
                      </span>
                    </div>
                  )}
                  {project.target_completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Target: {formatDate(project.target_completion_date)}</span>
                    </div>
                  )}
                  {project.project_details && project.project_details.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>{project.project_details.length} area{project.project_details.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Updated {formatDate(project.updated_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Home className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No projects yet</h3>
                <p className="text-muted-foreground">Start your first home remodeling project using the templates above.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}