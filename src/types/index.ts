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
  status: 'active' | 'archived' | 'completed'
  createdAt: string
  updatedAt: string
  coverImage?: string
  icon?: string
  color: string
}

export interface ProjectPage {
  id: string
  projectId: string
  userId: string
  title: string
  content: string
  pageType: 'page' | 'database' | 'gallery'
  parentPageId?: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface Database {
  id: string
  projectId: string
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
  status: 'todo' | 'in-progress' | 'completed'
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