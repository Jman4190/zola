"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { useUser } from "@/lib/user-store/provider"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Home, 
  Calendar, 
  DollarSign, 
  MapPin, 
  MessageSquare, 
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react"
import type { BaseProject, RoomData } from "@/lib/project-schemas"

interface ProjectDetails extends BaseProject {
  completion: number
  template_name?: string
  category?: string
}

export default function ProjectDashboard() {
  const { user } = useUser()
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<BaseProject>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }

    fetchProject()
  }, [user, router, projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/details`)
      if (response.ok) {
        const data = await response.json()
        const projectWithCompletion = {
          ...data,
          completion: calculateCompletion(data)
        }
        setProject(projectWithCompletion)
        setEditData(data)
      } else if (response.status === 404) {
        router.push('/projects')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
    if (project.rooms && Array.isArray(project.rooms)) {
      project.rooms.forEach(room => {
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

  const handleSave = async () => {
    if (!project) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      })

      if (response.ok) {
        await fetchProject()
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving project:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (project) {
      setEditData(project)
    }
    setIsEditing(false)
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

  const getCompletionIcon = (completion: number) => {
    if (completion >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (completion >= 50) return <Clock className="h-5 w-5 text-yellow-500" />
    return <AlertCircle className="h-5 w-5 text-red-500" />
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return ''
    return new Date(date).toISOString().split('T')[0]
  }

  const formatDisplayDate = (date: string | null) => {
    if (!date) return null
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  const formatRoomDetailValue = (value: any): string => {
    if (!value || value === 'unknown') return 'Not specified'
    
    if (typeof value === 'object') {
      // Handle nested objects by formatting them nicely
      const entries = Object.entries(value).filter(([_, v]) => v && v !== 'unknown' && v !== '')
      if (entries.length === 0) return 'Not specified'
      
      return entries.map(([key, val]) => {
        const formattedKey = key.replace(/_/g, ' ').toLowerCase()
        // Handle boolean values
        if (typeof val === 'boolean') {
          return formattedKey + (val ? ': yes' : ': no')
        }
        return `${formattedKey}: ${val}`
      }).join(', ')
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    return String(value)
  }

  const getCategoryIcon = (category?: string) => {
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

  const getRoomCompletionStatus = (room: RoomData) => {
    if (!room.details) return { completed: 0, total: 0, percentage: 0 }
    
    let completed = 0
    let total = 0
    
    Object.values(room.details).forEach(value => {
      total++
      if (value && value !== 'unknown' && value !== '') {
        completed++
      }
    })
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  const startChatForProject = () => {
    // For now, just go to main chat. Later we'll enhance this to create project-specific chats
    router.push(`/chat?project=${projectId}`)
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

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Project not found</h1>
          <Button onClick={() => router.push('/projects')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCategoryIcon(project.category)}</span>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <Badge className={getStatusColor(project.status)}>{project.status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Created {formatDisplayDate(project.created_at)}
          {project.updated_at !== project.created_at && (
            <> • Last updated {formatDisplayDate(project.updated_at)}</>
          )}
        </p>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Details</CardTitle>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editData.description || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your project goals and vision..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editData.location || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Project address or location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={editData.status || 'planning'} 
                    onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_min">Min Budget</Label>
                    <Input
                      id="budget_min"
                      type="number"
                      value={editData.budget_min || ''}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        budget_min: e.target.value ? Number(e.target.value) : null 
                      }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget_max">Max Budget</Label>
                    <Input
                      id="budget_max"
                      type="number"
                      value={editData.budget_max || ''}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        budget_max: e.target.value ? Number(e.target.value) : null 
                      }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formatDate(editData.start_date)}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        start_date: e.target.value || null 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_completion_date">Target Completion</Label>
                    <Input
                      id="target_completion_date"
                      type="date"
                      value={formatDate(editData.target_completion_date)}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        target_completion_date: e.target.value || null 
                      }))}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {project.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  </div>
                )}

                {project.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{project.location}</span>
                  </div>
                )}

                {(project.budget_min || project.budget_max) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Budget: {project.budget_min && project.budget_max 
                        ? `${formatCurrency(project.budget_min)} - ${formatCurrency(project.budget_max)}`
                        : formatCurrency(project.budget_min || project.budget_max || 0)
                      }
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {project.start_date && (
                    <div>
                      <Label className="text-sm font-medium">Start Date</Label>
                      <p className="text-muted-foreground mt-1">{formatDisplayDate(project.start_date)}</p>
                    </div>
                  )}
                  {project.target_completion_date && (
                    <div>
                      <Label className="text-sm font-medium">Target Completion</Label>
                      <p className="text-muted-foreground mt-1">{formatDisplayDate(project.target_completion_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Room Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {project.rooms && project.rooms.length > 0 ? (
              <div className="space-y-4">
                {project.rooms.map((room, index) => {
                  const roomStatus = getRoomCompletionStatus(room)
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{room.name}</span>
                        <span className="text-muted-foreground">
                          {roomStatus.completed}/{roomStatus.total} completed
                        </span>
                      </div>
                      <Progress value={roomStatus.percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No rooms defined yet. Chat with the assistant to add room details.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Description from Conversations */}
      {project.conversation_updates && project.conversation_updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Project Description
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Key decisions and updates captured from your conversations
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {project.conversation_updates.map((update, index) => (
                <p key={index} className="text-sm">{update}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room Details */}
      {project.rooms && project.rooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {project.rooms.map((room, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-6" />}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{room.name}</h3>
                    {room.details && Object.keys(room.details).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(room.details).map(([key, value]) => {
                          const formattedValue = formatRoomDetailValue(value)
                          if (formattedValue === 'Not specified') return null
                          
                          return (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                {key.replace(/_/g, ' ')}
                              </Label>
                              <p className="text-sm">{formattedValue}</p>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No details specified yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps with Integrated Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Project Progress</span>
                <div className="flex items-center gap-2">
                  {getCompletionIcon(project.completion)}
                  <span className="text-lg font-bold">{project.completion}%</span>
                </div>
              </div>
              <Progress value={project.completion} className="h-2 mb-3" />
              
              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  <span>{project.rooms?.length || 0} rooms</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Budget: {project.budget_max ? formatCurrency(project.budget_max) : 'TBD'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Target: {project.target_completion_date ? 
                    formatDisplayDate(project.target_completion_date)?.split(' ')[0] : 'TBD'}</span>
                </div>
              </div>
            </div>

            {/* Action Items Based on Progress */}
            {project.completion < 50 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">More Information Needed</p>
                  <p className="text-sm text-blue-700">Chat with the assistant to provide more details about your project. Focus on basic requirements like budget, timeline, and room specifications.</p>
                </div>
                <Button size="sm" onClick={startChatForProject}>
                  Start Chat
                </Button>
              </div>
            )}
            
            {project.completion >= 50 && project.completion < 90 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-900">Good Progress - {project.completion}% Complete</p>
                  <p className="text-sm text-yellow-700">Continue adding specific details about materials, finishes, and design preferences to complete your project planning.</p>
                </div>
              </div>
            )}
            
            {project.completion >= 90 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-900">Well Planned! - {project.completion}% Complete</p>
                  <p className="text-sm text-green-700">Your project is comprehensively defined. Consider finding contractors, obtaining permits, or finalizing material selections.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}