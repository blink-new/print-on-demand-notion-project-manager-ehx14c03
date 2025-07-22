import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Settings, FileText, Database, Image, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Layout } from '@/components/layout/Layout'
import { PageEditor } from '@/components/editor/PageEditor'
import { DatabaseBuilder } from '@/components/database/DatabaseBuilder'
import { DatabaseViewer } from '@/components/database/DatabaseViewer'
import { blink } from '@/blink/client'
import type { Project, Page, Database } from '@/types'

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [project, setProject] = useState<Project | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [databases, setDatabases] = useState<Database[]>([])
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [currentDatabase, setCurrentDatabase] = useState<Database | null>(null)
  const [activeTab, setActiveTab] = useState<'pages' | 'databases' | 'assets'>('pages')
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false)
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false)
  const [isDatabaseBuilderOpen, setIsDatabaseBuilderOpen] = useState(false)
  const [editingDatabase, setEditingDatabase] = useState<Database | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()

      // Load project
      const projectData = await blink.db.projects.list({
        where: { id: projectId, userId: user.id },
        limit: 1
      })

      if (projectData.length === 0) {
        navigate('/projects')
        return
      }

      setProject(projectData[0])

      // Load pages
      const pagesData = await blink.db.pages.list({
        where: { projectId, userId: user.id },
        orderBy: { position: 'asc' }
      })
      setPages(pagesData)

      // Set main page as current if exists
      const mainPage = pagesData.find(p => Number(p.isMainPage) > 0)
      if (mainPage) {
        setCurrentPage(mainPage)
      }

      // Load databases
      const databasesData = await blink.db.databases.list({
        where: { projectId, userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      // Parse properties JSON for each database
      const parsedDatabases = databasesData.map(db => ({
        ...db,
        properties: typeof db.properties === 'string' ? JSON.parse(db.properties) : db.properties
      }))

      setDatabases(parsedDatabases)

    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId, loadProjectData])

  const createPage = async (title: string) => {
    try {
      const user = await blink.auth.me()
      const now = new Date().toISOString()

      const newPage = {
        id: `page-${Date.now()}`,
        projectId,
        userId: user.id,
        title,
        content: JSON.stringify([{
          id: 'block-1',
          type: 'text',
          content: { text: `Welcome to ${title}!`, format: 'paragraph' },
          position: 0
        }]),
        pageType: 'page' as const,
        position: pages.length,
        isMainPage: pages.length === 0,
        createdAt: now,
        updatedAt: now
      }

      await blink.db.pages.create(newPage)
      
      const createdPage = { ...newPage, isMainPage: pages.length === 0 }
      setPages(prev => [...prev, createdPage])
      setCurrentPage(createdPage)
      setIsCreatePageOpen(false)
    } catch (error) {
      console.error('Failed to create page:', error)
    }
  }

  const createDatabase = async (name: string) => {
    try {
      const user = await blink.auth.me()
      const now = new Date().toISOString()

      const newDatabase = {
        id: `db-${Date.now()}`,
        projectId,
        userId: user.id,
        name,
        description: '',
        viewType: 'table' as const,
        properties: JSON.stringify([]),
        createdAt: now,
        updatedAt: now
      }

      await blink.db.databases.create(newDatabase)
      
      const createdDatabase = { ...newDatabase, properties: [] }
      setDatabases(prev => [...prev, createdDatabase])
      setEditingDatabase(createdDatabase)
      setIsDatabaseBuilderOpen(true)
      setIsCreateDatabaseOpen(false)
    } catch (error) {
      console.error('Failed to create database:', error)
    }
  }

  const handlePageSave = (updatedPage: Page) => {
    setPages(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p))
    setCurrentPage(updatedPage)
  }

  const handleDatabaseSave = (savedDatabase: Database) => {
    if (editingDatabase) {
      setDatabases(prev => prev.map(db => db.id === savedDatabase.id ? savedDatabase : db))
    } else {
      setDatabases(prev => [...prev, savedDatabase])
    }
    setIsDatabaseBuilderOpen(false)
    setEditingDatabase(null)
  }

  const editDatabase = (database: Database) => {
    setEditingDatabase(database)
    setIsDatabaseBuilderOpen(true)
  }

  const deleteDatabase = async (databaseId: string) => {
    try {
      await blink.db.databases.delete(databaseId)
      setDatabases(prev => prev.filter(db => db.id !== databaseId))
      if (currentDatabase?.id === databaseId) {
        setCurrentDatabase(null)
      }
    } catch (error) {
      console.error('Failed to delete database:', error)
    }
  }

  if (loading) {
    return (
      <Layout title="Loading..." subtitle="Please wait while we load your project">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout title="Project Not Found" subtitle="The project you're looking for doesn't exist">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Project not found</h3>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout 
      title={project.title} 
      subtitle={project.description || 'Project workspace'}
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r bg-background p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => navigate('/projects')}
              className="w-full justify-start"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>

            {/* Project Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {project.status}
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </CardHeader>
            </Card>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pages">Pages</TabsTrigger>
                <TabsTrigger value="databases">Databases</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
              </TabsList>

              <TabsContent value="pages" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Pages</h3>
                  <Dialog open={isCreatePageOpen} onOpenChange={setIsCreatePageOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Page</DialogTitle>
                      </DialogHeader>
                      <CreatePageForm onSubmit={createPage} />
                    </DialogContent>
                  </Dialog>
                </div>

                {pages.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No pages yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {pages.map((page) => (
                      <Button
                        key={page.id}
                        variant={currentPage?.id === page.id ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setCurrentPage(page)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {page.title}
                        {Number(page.isMainPage) > 0 && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            Main
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="databases" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Databases</h3>
                  <Dialog open={isCreateDatabaseOpen} onOpenChange={setIsCreateDatabaseOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Database</DialogTitle>
                      </DialogHeader>
                      <CreateDatabaseForm onSubmit={createDatabase} />
                    </DialogContent>
                  </Dialog>
                </div>

                {databases.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No databases yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {databases.map((database) => (
                      <div key={database.id} className="flex items-center">
                        <Button
                          variant={currentDatabase?.id === database.id ? "secondary" : "ghost"}
                          className="flex-1 justify-start"
                          onClick={() => setCurrentDatabase(database)}
                        >
                          <Database className="w-4 h-4 mr-2" />
                          {database.name}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editDatabase(database)}>
                              Edit Structure
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteDatabase(database.id)}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assets" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Assets</h3>
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-center py-8">
                  <Image className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Asset management coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {currentPage && (
            <PageEditor
              page={currentPage}
              onSave={handlePageSave}
              onTitleChange={(title) => {
                const updatedPage = { ...currentPage, title }
                setCurrentPage(updatedPage)
                setPages(prev => prev.map(p => p.id === currentPage.id ? updatedPage : p))
              }}
            />
          )}

          {currentDatabase && (
            <div className="p-6">
              <DatabaseViewer
                database={currentDatabase}
                onEdit={() => editDatabase(currentDatabase)}
              />
            </div>
          )}

          {!currentPage && !currentDatabase && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Welcome to {project.title}</h3>
                <p className="text-muted-foreground mb-4">
                  Select a page or database from the sidebar to get started
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setIsCreatePageOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Page
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDatabaseOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Database
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Builder Dialog */}
      {isDatabaseBuilderOpen && (
        <Dialog open={isDatabaseBuilderOpen} onOpenChange={setIsDatabaseBuilderOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DatabaseBuilder
              database={editingDatabase || undefined}
              projectId={projectId}
              onSave={handleDatabaseSave}
              onCancel={() => {
                setIsDatabaseBuilderOpen(false)
                setEditingDatabase(null)
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}

function CreatePageForm({ onSubmit }: { onSubmit: (title: string) => void }) {
  const [title, setTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onSubmit(title.trim())
      setTitle('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="pageTitle" className="block text-sm font-medium mb-2">
          Page Title
        </label>
        <input
          id="pageTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter page title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!title.trim()}>
          Create Page
        </Button>
      </div>
    </form>
  )
}

function CreateDatabaseForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
      setName('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="databaseName" className="block text-sm font-medium mb-2">
          Database Name
        </label>
        <input
          id="databaseName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter database name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!name.trim()}>
          Create Database
        </Button>
      </div>
    </form>
  )
}