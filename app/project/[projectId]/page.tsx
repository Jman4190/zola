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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Clock,
  FileText,
  Flag,
  HelpCircle,
  Sparkles,
  ArrowRight
} from "lucide-react"
import type { BaseProject } from "@/lib/project-schemas"
import { cn } from "@/lib/utils"

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
  const [isEditingProjectDetails, setIsEditingProjectDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('0')

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
        // Set active tab to first room
        if (data.project_details && data.project_details.length > 0) {
          setActiveTab('0')
        }
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
    const basicFields = ['description', 'location', 'budget']
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

  const formatStatusLabel = (status: string | null | undefined) => {
    if (!status) return null
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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

  type ValueStatus = 'value' | 'unknown' | 'not_set'

  interface ValueDescriptor {
    display: string
    status: ValueStatus
  }

  interface StructuredField {
    key: string
    label: string
    value: string
    status: ValueStatus
  }

  type SectionId =
    | 'size_layout'
    | 'general'
    | 'finishes'
    | 'fixtures'
    | 'lighting'
    | 'appliances'
    | 'bath'
    | 'storage'
    | 'systems'
    | 'features'
    | 'notes'
    | 'other'

  interface StructuredSection {
    id: SectionId
    title: string
    fields: StructuredField[]
  }

  interface FieldSchemaNode {
    key: string
    label?: string
    section?: SectionId
    formatter?: (value: unknown) => ValueDescriptor
    children?: FieldSchemaNode[]
  }

  const SECTION_TITLES: Record<SectionId, string> = {
    size_layout: 'Size & Layout',
    general: 'General',
    finishes: 'Finishes',
    fixtures: 'Fixtures',
    lighting: 'Lighting',
    appliances: 'Appliances',
    bath: 'Bath Features',
    storage: 'Storage & Built-ins',
    systems: 'Systems',
    features: 'Features',
    notes: 'Notes',
    other: 'Additional Details'
  }

  const SECTION_ORDER: SectionId[] = [
    'size_layout',
    'general',
    'finishes',
    'fixtures',
    'lighting',
    'appliances',
    'bath',
    'storage',
    'systems',
    'features',
    'notes',
    'other'
  ]

  const TOP_LEVEL_SECTION_MAP: Record<string, SectionId> = {
    size: 'size_layout',
    layout: 'size_layout',
    type: 'general',
    paint: 'finishes',
    flooring: 'finishes',
    backsplash: 'finishes',
    countertops: 'finishes',
    cabinets: 'finishes',
    windows: 'fixtures',
    doors: 'fixtures',
    plumbing: 'fixtures',
    lighting: 'lighting',
    appliances: 'appliances',
    electrical: 'systems',
    vanity: 'bath',
    shower: 'bath',
    bathtub: 'bath',
    toilet: 'bath',
    fireplace: 'features',
    builtins: 'storage',
    closet: 'storage',
    notes: 'notes'
  }

  const LABEL_OVERRIDES: Record<string, string> = {
    type: 'Room Type',
    notes: 'Notes'
  }

  const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  const formatFieldName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const interpretValue = (value: unknown): ValueDescriptor => {
    if (value === null || value === undefined || value === '') {
      return { display: 'Not set', status: 'not_set' }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) {
        return { display: 'Not set', status: 'not_set' }
      }

      const normalized = trimmed.toLowerCase()
      if (normalized === 'unknown') {
        return { display: 'Unknown', status: 'unknown' }
      }

      if (normalized === 'not set') {
        return { display: 'Not set', status: 'not_set' }
      }

      return { display: trimmed, status: 'value' }
    }

    if (typeof value === 'boolean') {
      return { display: value ? 'Yes' : 'No', status: 'value' }
    }

    if (typeof value === 'number') {
      return { display: value.toString(), status: 'value' }
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return { display: 'Not set', status: 'not_set' }
      }

      const items = value
        .map(item => interpretValue(item).display)
        .filter(Boolean)

      if (items.length === 0) {
        return { display: 'Not set', status: 'not_set' }
      }

      return { display: items.join(', '), status: 'value' }
    }

    return { display: 'Unknown', status: 'unknown' }
  }

  const formatSizeValue = (value: unknown): ValueDescriptor => {
    if (!isPlainObject(value)) {
      if (value === 'unknown' || value === 'Unknown') {
        return { display: 'Unknown', status: 'unknown' }
      }
      if (value === 'Not set') {
        return { display: 'Not set', status: 'not_set' }
      }
    }

    if (!isPlainObject(value)) {
      return interpretValue(value)
    }

    const squareFeet = interpretValue(value.square_feet)
    const length = interpretValue(value.length)
    const width = interpretValue(value.width)

    const hasSquareFeet = squareFeet.status === 'value'
    const hasLength = length.status === 'value'
    const hasWidth = width.status === 'value'

    if (hasSquareFeet) {
      return { display: `${squareFeet.display} sq ft`, status: 'value' }
    }

    if (hasLength && hasWidth) {
      return { display: `${length.display} ft × ${width.display} ft`, status: 'value' }
    }

    if (hasLength) {
      return { display: `${length.display} ft (length)`, status: 'value' }
    }

    if (hasWidth) {
      return { display: `${width.display} ft (width)`, status: 'value' }
    }

    if (
      squareFeet.status === 'unknown' ||
      length.status === 'unknown' ||
      width.status === 'unknown'
    ) {
      return { display: 'Unknown', status: 'unknown' }
    }

    return { display: 'Not set', status: 'not_set' }
  }

  const FIELD_BLUEPRINT: FieldSchemaNode[] = [
    { key: 'size', label: 'Size', section: 'size_layout', formatter: formatSizeValue },
    { key: 'layout', label: 'Layout', section: 'size_layout' },
    { key: 'type', label: 'Room Type', section: 'general' },
    {
      key: 'paint',
      section: 'finishes',
      children: [
        { key: 'color', label: 'Paint Color' },
        { key: 'finish', label: 'Paint Finish' },
        { key: 'accent_wall', label: 'Paint Accent Wall' }
      ]
    },
    {
      key: 'flooring',
      section: 'finishes',
      children: [
        { key: 'material', label: 'Flooring Material' },
        { key: 'color', label: 'Flooring Color' },
        { key: 'pattern', label: 'Flooring Pattern' }
      ]
    },
    {
      key: 'backsplash',
      section: 'finishes',
      children: [
        { key: 'material', label: 'Backsplash Material' },
        { key: 'pattern', label: 'Backsplash Pattern' },
        { key: 'color', label: 'Backsplash Color' }
      ]
    },
    {
      key: 'countertops',
      section: 'finishes',
      children: [
        { key: 'material', label: 'Countertops Material' },
        { key: 'color', label: 'Countertops Color' },
        { key: 'edge_style', label: 'Countertops Edge Style' }
      ]
    },
    {
      key: 'cabinets',
      section: 'finishes',
      children: [
        { key: 'style', label: 'Cabinets Style' },
        { key: 'finish', label: 'Cabinets Finish' },
        { key: 'material', label: 'Cabinets Material' },
        { key: 'color', label: 'Cabinets Color' }
      ]
    },
    {
      key: 'windows',
      section: 'fixtures',
      children: [
        { key: 'type', label: 'Windows Type' },
        { key: 'treatment', label: 'Windows Treatment' },
        { key: 'count', label: 'Windows Count' }
      ]
    },
    {
      key: 'doors',
      section: 'fixtures',
      children: [
        { key: 'type', label: 'Doors Type' },
        { key: 'count', label: 'Doors Count' }
      ]
    },
    {
      key: 'plumbing',
      section: 'fixtures',
      children: [
        { key: 'sink_style', label: 'Plumbing Sink Style' },
        { key: 'faucet_style', label: 'Plumbing Faucet Style' },
        { key: 'sink_material', label: 'Plumbing Sink Material' }
      ]
    },
    {
      key: 'lighting',
      section: 'lighting',
      children: [
        { key: 'overhead', label: 'Lighting Overhead' },
        { key: 'recessed', label: 'Lighting Recessed' },
        { key: 'pendant', label: 'Lighting Pendant' },
        { key: 'undercabinet', label: 'Lighting Undercabinet' },
        { key: 'chandelier', label: 'Lighting Chandelier' },
        { key: 'table_lamps', label: 'Lighting Table Lamps' },
        { key: 'floor_lamps', label: 'Lighting Floor Lamps' },
        { key: 'accent', label: 'Lighting Accent' },
        { key: 'vanity', label: 'Lighting Vanity' },
        { key: 'shower', label: 'Lighting Shower' }
      ]
    },
    {
      key: 'appliances',
      section: 'appliances',
      children: [
        { key: 'range', label: 'Appliances Range' },
        { key: 'refrigerator', label: 'Appliances Refrigerator' },
        { key: 'dishwasher', label: 'Appliances Dishwasher' },
        { key: 'microwave', label: 'Appliances Microwave' },
        { key: 'disposal', label: 'Appliances Disposal' }
      ]
    },
    {
      key: 'electrical',
      section: 'systems',
      children: [
        { key: 'needs_upgrade', label: 'Electrical Needs Upgrade' },
        { key: 'outlets_adequate', label: 'Electrical Outlets Adequate' },
        { key: 'smart_home', label: 'Electrical Smart Home' }
      ]
    },
    {
      key: 'vanity',
      section: 'bath',
      children: [
        { key: 'style', label: 'Vanity Style' },
        { key: 'material', label: 'Vanity Material' },
        { key: 'countertop', label: 'Vanity Countertop' }
      ]
    },
    {
      key: 'shower',
      section: 'bath',
      children: [
        { key: 'type', label: 'Shower Type' },
        { key: 'door_type', label: 'Shower Door Type' },
        { key: 'tile_material', label: 'Shower Tile Material' }
      ]
    },
    {
      key: 'bathtub',
      section: 'bath',
      children: [
        { key: 'type', label: 'Bathtub Type' },
        { key: 'material', label: 'Bathtub Material' }
      ]
    },
    {
      key: 'toilet',
      section: 'bath',
      children: [
        { key: 'type', label: 'Toilet Type' }
      ]
    },
    {
      key: 'fireplace',
      section: 'features',
      children: [
        { key: 'type', label: 'Fireplace Type' },
        { key: 'surround', label: 'Fireplace Surround' }
      ]
    },
    {
      key: 'builtins',
      section: 'storage',
      children: [
        { key: 'entertainment_center', label: 'Built-ins Entertainment Center' },
        { key: 'bookshelves', label: 'Built-ins Bookshelves' },
        { key: 'window_seat', label: 'Built-ins Window Seat' }
      ]
    },
    {
      key: 'closet',
      section: 'storage',
      children: [
        { key: 'type', label: 'Closet Type' },
        { key: 'organization', label: 'Closet Organization' }
      ]
    },
    { key: 'notes', label: 'Notes', section: 'notes' }
  ]

  const deriveLabel = (segments: string[], explicit?: string): string => {
    if (explicit) return explicit

    const fullPath = segments.join('.')
    if (LABEL_OVERRIDES[fullPath]) return LABEL_OVERRIDES[fullPath]

    const lastSegment = segments[segments.length - 1]
    if (LABEL_OVERRIDES[lastSegment]) return LABEL_OVERRIDES[lastSegment]

    if (segments.length > 1) {
      const parent = segments[segments.length - 2]
      const parentLabel = LABEL_OVERRIDES[parent] ?? formatFieldName(parent)
      const currentLabel = formatFieldName(lastSegment)
      if (!currentLabel.toLowerCase().includes(parentLabel.toLowerCase())) {
        return `${parentLabel} ${currentLabel}`
      }
    }

    return formatFieldName(lastSegment)
  }

  const getSectionForPath = (segments: string[], fallback?: SectionId): SectionId => {
    if (fallback) return fallback
    const topLevel = segments[0]
    return TOP_LEVEL_SECTION_MAP[topLevel] ?? 'other'
  }

  const getStructuredSections = (details: unknown): StructuredSection[] => {
    const sourceDetails = isPlainObject(details) ? details : {}
    const sections: Partial<Record<SectionId, StructuredSection>> = {}

    const ensureSection = (id: SectionId) => {
      if (!sections[id]) {
        sections[id] = {
          id,
          title: SECTION_TITLES[id],
          fields: []
        }
      }
      return sections[id]
    }

    const pushField = (
      sectionId: SectionId,
      pathSegments: string[],
      labelOverride: string | undefined,
      descriptor: ValueDescriptor
    ) => {
      const section = ensureSection(sectionId)
      section.fields.push({
        key: pathSegments.join('.'),
        label: deriveLabel(pathSegments, labelOverride),
        value: descriptor.display,
        status: descriptor.status
      })
    }

    const processNode = (
      node: FieldSchemaNode,
      value: unknown,
      pathSegments: string[],
      inheritedSection?: SectionId
    ) => {
      const section = node.section ?? inheritedSection ?? getSectionForPath(pathSegments, inheritedSection)

      if (node.children && node.children.length > 0) {
        const source = isPlainObject(value) ? value : undefined
        node.children.forEach(child => {
          const childValue = source ? source[child.key] : undefined
          processNode(child, childValue, [...pathSegments, child.key], section)
        })

        if (source) {
          Object.entries(source).forEach(([childKey, childValue]) => {
            if (!node.children?.some(child => child.key === childKey)) {
              processNode({ key: childKey }, childValue, [...pathSegments, childKey], section)
            }
          })
        }
        return
      }

      if (!node.formatter && isPlainObject(value)) {
        const entries = Object.entries(value)
        if (entries.length === 0) {
          pushField(section, pathSegments, node.label, interpretValue(undefined))
        } else {
          entries.forEach(([childKey, childValue]) => {
            processNode({ key: childKey }, childValue, [...pathSegments, childKey], section)
          })
        }
        return
      }

      const descriptor = node.formatter ? node.formatter(value) : interpretValue(value)
      pushField(section, pathSegments, node.label, descriptor)
    }

    FIELD_BLUEPRINT.forEach(node => {
      if (!Object.prototype.hasOwnProperty.call(sourceDetails, node.key)) {
        return
      }

      const value = sourceDetails[node.key]
      processNode(node, value, [node.key], node.section)
    })

    Object.entries(sourceDetails).forEach(([key, value]) => {
      if (!FIELD_BLUEPRINT.some(node => node.key === key)) {
        processNode({ key }, value, [key])
      }
    })

    const orderedSections: StructuredSection[] = []
    SECTION_ORDER.forEach(sectionId => {
      const section = sections[sectionId]
      if (section && section.fields.length > 0) {
        orderedSections.push(section)
      }
    })

    return orderedSections
  }

  const handleFieldAction = () => {
    setIsEditingProjectDetails(true)
  }

  const renderFieldValue = (field: StructuredField) => {
    if (field.status === 'value') {
      return (
        <div className="flex w-full items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-primary-700 shadow-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{field.value}</span>
        </div>
      )
    }

    const displayLabel = field.status === 'unknown' ? 'Unknown' : 'Not specified'

    return (
      <button
        type="button"
        onClick={handleFieldAction}
        className={cn(
          'shimmer group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-2 text-left text-sm font-medium text-muted-foreground/80 transition',
          'hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
        )}
      >
        <div className="relative z-10 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 opacity-70 transition group-hover:opacity-100" />
          <span>{displayLabel}</span>
        </div>
        <span className="relative z-10 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 transition group-hover:text-primary">
          Add detail
          <ArrowRight className="h-3 w-3" />
        </span>
      </button>
    )
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


  const startChatForProject = () => {
    // For now, just go to main chat. Later we'll enhance this to create project-specific chats
    router.push(`/p/${projectId}`)
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

  const formattedStatus = formatStatusLabel(project.status ?? null)
  const headerStatus = formatStatusLabel(project.status ?? 'planning') ?? 'Planning'
  const formattedBudget = project.budget ? formatCurrency(project.budget) : null
  const formattedTargetDate = formatDisplayDate(project.target_completion_date)

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className="px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex w-full max-w-4xl flex-col space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCategoryIcon(project.category)}</span>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <Badge className={getStatusColor(project.status ?? 'planning')}>{headerStatus}</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Created {formatDisplayDate(project.created_at)}
          {project.updated_at !== project.created_at && (
            <> • Last updated {formatDisplayDate(project.updated_at)}</>
          )}
        </p>
      </div>

      {/* Project Overview */}
      <div>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Overview</CardTitle>
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
                    onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as BaseProject['status'] }))}
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

                <div className="space-y-2 w-full sm:max-w-xs">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={editData.budget ?? ''}
                    onChange={(e) => setEditData(prev => ({ 
                      ...prev, 
                      budget: e.target.value ? Number(e.target.value) : null 
                    }))}
                    placeholder="0"
                    className="w-full"
                  />
                </div>

                {/* start_date removed */}
                
                <div className="space-y-2 w-full sm:max-w-xs">
                  <Label htmlFor="target_completion_date">Target Completion</Label>
                  <Input
                    id="target_completion_date"
                    type="date"
                    value={formatDate(editData.target_completion_date ?? null)}
                    onChange={(e) => setEditData(prev => ({ 
                      ...prev, 
                      target_completion_date: (e.target.value ?? null) as string | null 
                    }))}
                    className="w-full"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className={`text-sm text-muted-foreground mt-1 ${
                    project.description ? '' : 'italic'
                  }`}>
                    {project.description || 'Add a brief description to outline your project.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${
                      project.location ? '' : 'text-muted-foreground italic'
                    }`}>
                      {project.location || 'Add a location'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${
                      formattedStatus ? '' : 'text-muted-foreground italic'
                    }`}>
                      Status: {formattedStatus || 'Set project status'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${
                      formattedBudget ? '' : 'text-muted-foreground italic'
                    }`}>
                      Budget: {formattedBudget || 'Add a budget'}
                    </span>
                  </div>

                  {/* start_date removed */}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${
                      formattedTargetDate ? '' : 'text-muted-foreground italic'
                    }`}>
                      Target Completion: {formattedTargetDate || 'Set a target completion date'}
                    </span>
                  </div>
                </div>
              </div>
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

      {/* Project Details */}
      {project.project_details && project.project_details.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Information collected from your project setup
                </p>
              </div>
              <Button 
                onClick={() => setIsEditingProjectDetails(!isEditingProjectDetails)} 
                variant="outline" 
                size="sm"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditingProjectDetails ? 'View' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {project.project_details.length === 1 ? (
              // Single room - no tabs needed
              <div className="space-y-4">
                {(() => {
                  const area = project.project_details[0]
                  const sections = getStructuredSections(area.details)
                  const fieldCount = sections.reduce((total, section) => total + section.fields.length, 0)

                  if (fieldCount === 0) {
                    return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="font-medium">
                            {area.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No details specified yet. Chat with the assistant to add information.
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-medium">
                          {area.name}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                        </Badge>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-muted bg-background shadow-sm">
                        {sections.map((section, index) => (
                          <div
                            key={section.id}
                            className={cn('p-4 md:p-6', index !== 0 && 'border-t border-muted/60')}
                          >
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {section.title}
                            </h4>
                            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                              {section.fields.map(field => (
                                <div key={field.key} className="space-y-1">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                                    {field.label}
                                  </p>
                                  <p
                                    className={cn(
                                      'text-sm font-medium',
                                      field.status === 'not_set' && 'text-muted-foreground italic',
                                      field.status === 'unknown' && 'text-amber-600'
                                    )}
                                  >
                                    {field.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              // Multiple rooms - use tabs
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full bg-muted p-1 rounded-lg" style={{ gridTemplateColumns: `repeat(${project.project_details.length}, 1fr)` }}>
                  {project.project_details.map((area, index) => (
                    <TabsTrigger 
                      key={index} 
                      value={index.toString()}
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 font-medium"
                    >
                      {area.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {project.project_details.map((area, index) => {
                  const sections = getStructuredSections(area.details)
                  const fieldCount = sections.reduce((total, section) => total + section.fields.length, 0)

                  return (
                    <TabsContent key={index} value={index.toString()} className="space-y-6 mt-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-medium">
                          {area.name}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                        </Badge>
                      </div>

                      {fieldCount > 0 ? (
                        <div className="overflow-hidden rounded-lg border border-muted bg-background shadow-sm">
                          {sections.map((section, sectionIndex) => (
                            <div
                              key={section.id}
                              className={cn('p-4 md:p-6', sectionIndex !== 0 && 'border-t border-muted/60')}
                            >
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {section.title}
                              </h4>
                              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                {section.fields.map(field => (
                                  <div key={field.key} className="space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                                      {field.label}
                                    </p>
                                    <p
                                      className={cn(
                                        'text-sm font-medium',
                                        field.status === 'not_set' && 'text-muted-foreground italic',
                                        field.status === 'unknown' && 'text-amber-600'
                                      )}
                                    >
                                      {field.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-muted p-8 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            No details specified yet for {area.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Chat with the assistant to add information about this room.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
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
                  <span>{project.project_details?.length || 0} project areas</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Budget: {project.budget ? formatCurrency(project.budget) : 'TBD'}</span>
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
      </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
