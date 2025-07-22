export interface User {
  id: string
  email: string
  displayName?: string
  avatar?: string
}

export interface Project {
  id: string
  userId: string
  title: string
  description?: string
  status: 'active' | 'archived' | 'completed' | 'on-hold'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  coverImage?: string
  icon?: string
  color?: string
}

export interface Page {
  id: string
  projectId?: string
  userId: string
  title: string
  content: string
  pageType: 'page' | 'database' | 'gallery'
  parentPageId?: string
  position: number
  isMainPage: boolean
  createdAt: string
  updatedAt: string
}

export interface Database {
  id: string
  projectId?: string
  userId: string
  name: string
  description?: string
  viewType: 'table' | 'list' | 'page'
  properties: DatabaseProperty[]
  createdAt: string
  updatedAt: string
}

export interface DatabaseProperty {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'checkbox' | 'url' | 'email' | 'phone' | 'rating' | 'file' | 'image'
  options?: string[]
  required?: boolean
}

export interface DatabaseEntry {
  id: string
  databaseId: string
  userId: string
  data: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface UniversalAsset {
  id: string
  userId: string
  filename: string
  fileUrl: string
  fileType: string
  fileSize: number
  albumId?: string
  folderPath: string
  tags: string[]
  description?: string
  createdAt: string
  updatedAt: string
}

export interface AssetAlbum {
  id: string
  userId: string
  name: string
  description?: string
  coverImage?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectAsset {
  id: string
  projectId: string
  userId: string
  filename: string
  fileUrl: string
  fileType: string
  fileSize: number
  galleryName: string
  tags: string[]
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId?: string
  userId: string
  title: string
  description?: string
  status: 'todo' | 'inProgress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId?: string
  userId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: string
  userId: string
  originalName: string
  url: string
  type: string
  size: number
  projectId?: string
  createdAt: string
  updatedAt: string
}

// Block types for the page editor
export interface Block {
  id: string
  type: 'text' | 'heading' | 'image' | 'database' | 'gallery' | 'embed' | 'divider'
  content: any
  position: number
}

export interface TextBlock extends Block {
  type: 'text'
  content: {
    text: string
    format?: 'paragraph' | 'quote' | 'code'
  }
}

export interface HeadingBlock extends Block {
  type: 'heading'
  content: {
    text: string
    level: 1 | 2 | 3
  }
}

export interface ImageBlock extends Block {
  type: 'image'
  content: {
    url: string
    caption?: string
    alt?: string
  }
}

export interface DatabaseBlock extends Block {
  type: 'database'
  content: {
    databaseId: string
    viewType: 'table' | 'list' | 'page'
  }
}

export interface GalleryBlock extends Block {
  type: 'gallery'
  content: {
    assets: string[] // asset IDs
    layout: 'grid' | 'masonry'
  }
}

export interface EmbedBlock extends Block {
  type: 'embed'
  content: {
    url: string
    title?: string
    description?: string
  }
}