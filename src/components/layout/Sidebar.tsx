import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  FolderOpen, 
  Database, 
  Image, 
  CheckSquare, 
  FileText, 
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    projects: true,
    assets: true,
    workspace: true
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const mainNavItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/projects', icon: FolderOpen, label: 'Projects' },
    { href: '/assets', icon: Image, label: 'Universal Assets' },
    { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { href: '/notes', icon: FileText, label: 'Notes' },
  ]

  const workspaceItems = [
    { href: '/databases', icon: Database, label: 'Databases' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-background", className)}>
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <h2 className="text-lg font-semibold text-primary">PrintFlow</h2>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          <Separator />

          {/* Projects Section */}
          <div>
            <Button
              variant="ghost"
              className="w-full justify-between p-2"
              onClick={() => toggleSection('projects')}
            >
              <span className="text-sm font-medium">Projects</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
                {expandedSections.projects ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </Button>
            
            {expandedSections.projects && (
              <div className="ml-4 space-y-1">
                <div className="text-sm text-muted-foreground py-2">
                  No projects yet
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Assets Section */}
          <div>
            <Button
              variant="ghost"
              className="w-full justify-between p-2"
              onClick={() => toggleSection('assets')}
            >
              <span className="text-sm font-medium">Asset Library</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
                {expandedSections.assets ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </Button>
            
            {expandedSections.assets && (
              <div className="ml-4 space-y-1">
                <Link to="/assets/albums">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Albums
                  </Button>
                </Link>
                <Link to="/assets/folders">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Folders
                  </Button>
                </Link>
                <Link to="/assets/tags">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Tags
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <Separator />

          {/* Workspace Section */}
          <div>
            <Button
              variant="ghost"
              className="w-full justify-between p-2"
              onClick={() => toggleSection('workspace')}
            >
              <span className="text-sm font-medium">Workspace</span>
              {expandedSections.workspace ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            {expandedSections.workspace && (
              <div className="ml-4 space-y-1">
                {workspaceItems.map((item) => (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant={location.pathname === item.href ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                    >
                      <item.icon className="mr-2 h-3 w-3" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}