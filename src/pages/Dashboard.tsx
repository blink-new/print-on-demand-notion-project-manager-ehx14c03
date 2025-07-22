import { useState, useEffect, useCallback } from 'react'
import { Plus, FolderOpen, Image, CheckSquare, FileText, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Layout } from '@/components/layout/Layout'
import { blink } from '@/blink/client'
import type { Project, Task, Asset } from '@/types'

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [recentAssets, setRecentAssets] = useState<Asset[]>([])
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalAssets: 0,
    completedTasks: 0,
    totalTasks: 0
  })
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      // Load projects
      const projectsData = await blink.db.projects.list({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        limit: 6
      })
      setProjects(projectsData)

      // Load recent tasks
      const tasksData = await blink.db.tasks.list({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        limit: 5
      })
      setRecentTasks(tasksData)

      // Load recent assets
      const assetsData = await blink.db.assets.list({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        limit: 8
      })
      setRecentAssets(assetsData)

      // Calculate stats
      const allProjects = await blink.db.projects.list({
        where: { userId: user.id }
      })
      const allTasks = await blink.db.tasks.list({
        where: { userId: user.id }
      })
      const allAssets = await blink.db.assets.list({
        where: { userId: user.id }
      })

      setStats({
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter(p => p.status === 'active').length,
        totalAssets: allAssets.length,
        completedTasks: allTasks.filter(t => t.status === 'completed').length,
        totalTasks: allTasks.length
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'secondary'
      case 'inProgress': return 'default'
      case 'completed': return 'outline'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Welcome back! Here's what's happening with your projects.">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard" subtitle="Welcome back! Here's what's happening with your projects.">
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProjects} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Design Assets</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
              <p className="text-xs text-muted-foreground">
                Images and files
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </div>
              <Progress 
                value={stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">
                From last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your latest print-on-demand projects</CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground">Get started by creating your first project</p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{project.title}</CardTitle>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                        <Badge variant="outline" className="capitalize">
                          {project.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest task updates</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="text-center py-4">
                  <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No tasks yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.dueDate && `Due ${new Date(task.dueDate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant={getTaskStatusColor(task.status)} className="capitalize">
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Assets</CardTitle>
              <CardDescription>Your latest uploaded design assets</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAssets.length === 0 ? (
                <div className="text-center py-4">
                  <Image className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No assets yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {recentAssets.slice(0, 8).map((asset) => (
                    <div key={asset.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                      {asset.type === 'image' ? (
                        <img 
                          src={asset.url} 
                          alt={asset.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}