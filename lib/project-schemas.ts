// Project data validation schemas and types

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold'

export interface BaseProject {
  id: string
  user_id: string
  name: string
  description?: string
  template_id?: string
  status: ProjectStatus
  budget?: number | null
  target_completion_date?: string | null
  location?: string | null
  conversation_updates?: string[]
  project_details: RoomData[]
  created_at: string
  updated_at: string
}

export interface RoomData {
  name: string
  details: RoomDetails
}

// Kitchen-specific types
export interface KitchenDetails extends RoomDetails {
  layout?: 'galley' | 'L-shaped' | 'U-shaped' | 'island' | 'peninsula' | 'unknown'
  cabinets?: {
    style?: 'modern' | 'traditional' | 'shaker' | 'transitional' | 'unknown'
    material?: 'wood' | 'laminate' | 'thermofoil' | 'metal' | 'unknown'
    finish?: 'painted' | 'stained' | 'natural' | 'unknown'
    color?: string
  }
  countertops?: {
    material?: 'granite' | 'quartz' | 'marble' | 'butcher_block' | 'laminate' | 'concrete' | 'unknown'
    color?: string
    edge_style?: 'straight' | 'beveled' | 'bullnose' | 'ogee' | 'unknown'
  }
  appliances?: {
    range?: 'gas' | 'electric' | 'induction' | 'dual_fuel' | 'unknown'
    refrigerator?: 'standard' | 'counter_depth' | 'built_in' | 'unknown'
    dishwasher?: 'standard' | 'drawer_style' | 'integrated' | 'unknown'
    microwave?: 'countertop' | 'over_range' | 'built_in' | 'drawer' | 'unknown'
    disposal?: boolean | 'unknown'
  }
  flooring?: {
    material?: 'hardwood' | 'tile' | 'vinyl' | 'laminate' | 'stone' | 'unknown'
    color?: string
    pattern?: string
  }
  lighting?: {
    recessed?: boolean | 'unknown'
    pendant?: boolean | 'unknown'
    undercabinet?: boolean | 'unknown'
    chandelier?: boolean | 'unknown'
  }
  backsplash?: {
    material?: 'tile' | 'stone' | 'glass' | 'metal' | 'painted' | 'unknown'
    pattern?: 'subway' | 'herringbone' | 'mosaic' | 'large_format' | 'unknown'
    color?: string
  }
  plumbing?: {
    sink_style?: 'undermount' | 'drop_in' | 'farmhouse' | 'integrated' | 'unknown'
    faucet_style?: 'pull_down' | 'pull_out' | 'standard' | 'bridge' | 'unknown'
    sink_material?: 'stainless' | 'composite' | 'porcelain' | 'copper' | 'unknown'
  }
}

// Bathroom-specific types
export interface BathroomDetails extends RoomDetails {
  type?: 'full' | 'half' | 'three_quarter' | 'master' | 'unknown'
  vanity?: {
    style?: 'single' | 'double' | 'floating' | 'traditional' | 'unknown'
    material?: 'wood' | 'laminate' | 'metal' | 'unknown'
    countertop?: 'granite' | 'quartz' | 'marble' | 'tile' | 'unknown'
  }
  shower?: {
    type?: 'walk_in' | 'tub_combo' | 'corner' | 'steam' | 'unknown'
    door_type?: 'sliding' | 'pivot' | 'bi_fold' | 'curtain' | 'unknown'
    tile_material?: 'ceramic' | 'porcelain' | 'stone' | 'glass' | 'unknown'
  }
  bathtub?: {
    type?: 'alcove' | 'freestanding' | 'corner' | 'drop_in' | 'none' | 'unknown'
    material?: 'acrylic' | 'cast_iron' | 'fiberglass' | 'stone' | 'unknown'
  }
  toilet?: {
    type?: 'standard' | 'comfort_height' | 'wall_mounted' | 'bidet_combo' | 'unknown'
  }
  flooring?: {
    material?: 'tile' | 'vinyl' | 'stone' | 'hardwood' | 'unknown'
    color?: string
  }
  lighting?: {
    vanity?: boolean | 'unknown'
    overhead?: boolean | 'unknown'
    shower?: boolean | 'unknown'
    accent?: boolean | 'unknown'
  }
}

// Living room specific types
export interface LivingRoomDetails extends RoomDetails {
  layout?: 'open_concept' | 'traditional' | 'sectional' | 'formal' | 'unknown'
  flooring?: {
    material?: 'hardwood' | 'carpet' | 'tile' | 'vinyl' | 'area_rugs' | 'unknown'
    color?: string
  }
  lighting?: {
    overhead?: boolean | 'unknown'
    table_lamps?: boolean | 'unknown'
    floor_lamps?: boolean | 'unknown'
    accent?: boolean | 'unknown'
  }
  fireplace?: {
    type?: 'wood' | 'gas' | 'electric' | 'none' | 'unknown'
    surround?: 'brick' | 'stone' | 'tile' | 'wood' | 'unknown'
  }
  builtins?: {
    entertainment_center?: boolean | 'unknown'
    bookshelves?: boolean | 'unknown'
    window_seat?: boolean | 'unknown'
  }
}

// Bedroom specific types
export interface BedroomDetails extends RoomDetails {
  type?: 'master' | 'guest' | 'child' | 'teen' | 'unknown'
  flooring?: {
    material?: 'hardwood' | 'carpet' | 'tile' | 'vinyl' | 'unknown'
    color?: string
  }
  lighting?: {
    overhead?: boolean | 'unknown'
    bedside?: boolean | 'unknown'
    accent?: boolean | 'unknown'
  }
  closet?: {
    type?: 'walk_in' | 'reach_in' | 'built_in' | 'wardrobe' | 'unknown'
    organization?: boolean | 'unknown'
  }
}

// Base room details interface
export interface RoomDetails {
  size?: {
    length?: number
    width?: number
    square_feet?: number
  }
  windows?: {
    count?: number
    type?: 'single_hung' | 'double_hung' | 'casement' | 'sliding' | 'bay' | 'unknown'
    treatment?: 'blinds' | 'curtains' | 'shutters' | 'none' | 'unknown'
  }
  doors?: {
    count?: number
    type?: 'standard' | 'pocket' | 'barn' | 'french' | 'unknown'
  }
  electrical?: {
    outlets_adequate?: boolean | 'unknown'
    needs_upgrade?: boolean | 'unknown'
    smart_home?: boolean | 'unknown'
  }
  paint?: {
    color?: string
    finish?: 'matte' | 'eggshell' | 'satin' | 'semi_gloss' | 'gloss' | 'unknown'
    accent_wall?: boolean | 'unknown'
  }
  notes?: string
}

// Validation functions
export function validateProjectData(data: Partial<BaseProject>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.name !== undefined && !data.name.trim()) {
    errors.push('Project name is required')
  }

  if (data.status && !['planning', 'in_progress', 'completed', 'on_hold'].includes(data.status)) {
    errors.push('Invalid project status')
  }

  if (data.budget !== undefined && data.budget < 0) {
    errors.push('Budget cannot be negative')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function getProjectCompletionPercentage(project: BaseProject): number {
  if (!project.project_details || project.project_details.length === 0) {
    return 0
  }

  let totalFields = 0
  let completedFields = 0

  // Count basic project info (excluding start_date as it's not required)
  const basicFields = [
    'name', 'description', 'location'
  ]
  
  basicFields.forEach(field => {
    totalFields++
    if (project[field as keyof BaseProject] && project[field as keyof BaseProject] !== 'unknown') {
      completedFields++
    }
  })

  // Count room details
  project.project_details.forEach(room => {
    const roomDetails = room.details
    if (!roomDetails) return

    Object.values(roomDetails).forEach(value => {
      totalFields++
      if (value && value !== 'unknown' && value !== '') {
        completedFields++
      }
    })
  })

  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
}

export function getRoomDetailsTemplate(category: string, _roomName: string): RoomDetails {
  const baseTemplate: RoomDetails = {
    size: { square_feet: undefined },
    windows: { count: undefined, type: 'unknown', treatment: 'unknown' },
    doors: { count: undefined, type: 'unknown' },
    electrical: { outlets_adequate: 'unknown', needs_upgrade: 'unknown' },
    paint: { color: '', finish: 'unknown' }
  }

  switch (category.toLowerCase()) {
    case 'kitchen':
      return {
        ...baseTemplate,
        ...({
          layout: 'unknown',
          cabinets: { style: 'unknown', material: 'unknown', finish: 'unknown' },
          countertops: { material: 'unknown' },
          appliances: {
            range: 'unknown',
            refrigerator: 'unknown',
            dishwasher: 'unknown',
            microwave: 'unknown'
          },
          flooring: { material: 'unknown' },
          lighting: { recessed: 'unknown', pendant: 'unknown', undercabinet: 'unknown' },
          backsplash: { material: 'unknown', pattern: 'unknown' },
          plumbing: { sink_style: 'unknown', faucet_style: 'unknown' }
        } as KitchenDetails)
      }

    case 'bathroom':
      return {
        ...baseTemplate,
        ...({
          type: 'unknown',
          vanity: { style: 'unknown', material: 'unknown', countertop: 'unknown' },
          shower: { type: 'unknown', door_type: 'unknown', tile_material: 'unknown' },
          bathtub: { type: 'unknown', material: 'unknown' },
          toilet: { type: 'unknown' },
          flooring: { material: 'unknown' },
          lighting: { vanity: 'unknown', overhead: 'unknown', shower: 'unknown' }
        } as BathroomDetails)
      }

    case 'living_room':
      return {
        ...baseTemplate,
        ...({
          layout: 'unknown',
          flooring: { material: 'unknown' },
          lighting: { overhead: 'unknown', table_lamps: 'unknown', floor_lamps: 'unknown' },
          fireplace: { type: 'unknown', surround: 'unknown' },
          builtins: { entertainment_center: 'unknown', bookshelves: 'unknown' }
        } as LivingRoomDetails)
      }

    case 'bedroom':
      return {
        ...baseTemplate,
        ...({
          type: 'unknown',
          flooring: { material: 'unknown' },
          lighting: { overhead: 'unknown', bedside: 'unknown', accent: 'unknown' },
          closet: { type: 'unknown', organization: 'unknown' }
        } as BedroomDetails)
      }

    default:
      return baseTemplate
  }
}