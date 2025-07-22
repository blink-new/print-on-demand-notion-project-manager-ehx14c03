import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Filter, Search, MoreHorizontal, Table, List, Grid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { blink } from '@/blink/client'
import type { Database, DatabaseEntry, DatabaseProperty } from '@/types'

interface DatabaseViewerProps {
  database: Database
  onEdit: () => void
}

export function DatabaseViewer({ database, onEdit }: DatabaseViewerProps) {
  const [entries, setEntries] = useState<DatabaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'table' | 'list' | 'page'>(database.viewType)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DatabaseEntry | null>(null)

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true)
      const entriesData = await blink.db.databaseEntries.list({
        where: { databaseId: database.id },
        orderBy: { createdAt: 'desc' }
      })
      
      // Parse JSON data for each entry
      const parsedEntries = entriesData.map(entry => ({
        ...entry,
        data: typeof entry.data === 'string' ? JSON.parse(entry.data) : entry.data
      }))
      
      setEntries(parsedEntries)
    } catch (error) {
      console.error('Failed to load database entries:', error)
    } finally {
      setLoading(false)
    }
  }, [database.id])

  useEffect(() => {
    loadEntries()
  }, [database.id, loadEntries])

  const addEntry = () => {
    setEditingEntry(null)
    setIsAddEntryOpen(true)
  }

  const editEntry = (entry: DatabaseEntry) => {
    setEditingEntry(entry)
    setIsAddEntryOpen(true)
  }

  const deleteEntry = async (entryId: string) => {
    try {
      await blink.db.databaseEntries.delete(entryId)
      setEntries(prev => prev.filter(e => e.id !== entryId))
    } catch (error) {
      console.error('Failed to delete entry:', error)
    }
  }

  const saveEntry = async (entryData: Record<string, any>) => {
    try {
      const user = await blink.auth.me()
      const now = new Date().toISOString()

      if (editingEntry) {
        // Update existing entry
        await blink.db.databaseEntries.update(editingEntry.id, {
          data: JSON.stringify(entryData),
          updatedAt: now
        })
        
        setEntries(prev => prev.map(e => 
          e.id === editingEntry.id 
            ? { ...e, data: entryData, updatedAt: now }
            : e
        ))
      } else {
        // Create new entry
        const newEntry = {
          id: `entry-${Date.now()}`,
          databaseId: database.id,
          userId: user.id,
          data: JSON.stringify(entryData),
          createdAt: now,
          updatedAt: now
        }

        await blink.db.databaseEntries.create(newEntry)
        
        setEntries(prev => [{
          ...newEntry,
          data: entryData
        }, ...prev])
      }

      setIsAddEntryOpen(false)
      setEditingEntry(null)
    } catch (error) {
      console.error('Failed to save entry:', error)
    }
  }

  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true
    
    return database.properties.some(property => {
      const value = entry.data[property.name]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return false
    })
  })

  const renderPropertyValue = (property: DatabaseProperty, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">—</span>
    }

    switch (property.type) {
      case 'checkbox':
        return <Checkbox checked={Boolean(value)} disabled />
      case 'select':
      case 'multiSelect':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {v}
                </Badge>
              ))}
            </div>
          )
        }
        return <Badge variant="secondary" className="text-xs">{value}</Badge>
      case 'url':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        )
      case 'email':
        return (
          <a 
            href={`mailto:${value}`}
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        )
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'rating':
        return (
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < value ? 'text-yellow-400' : 'text-gray-300'}>
                ★
              </span>
            ))}
          </div>
        )
      case 'image':
        return value ? (
          <img src={value} alt="" className="w-12 h-12 object-cover rounded" />
        ) : null
      default:
        return <span>{String(value)}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{database.name}</h2>
          {database.description && (
            <p className="text-muted-foreground">{database.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Database
          </Button>
          <Button onClick={addEntry}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-1 border rounded-md">
          <Button
            variant={viewType === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('table')}
            className="rounded-r-none"
          >
            <Table className="w-4 h-4" />
          </Button>
          <Button
            variant={viewType === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('list')}
            className="rounded-none"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewType === 'page' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('page')}
            className="rounded-l-none"
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No entries yet</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No entries match your search.' : 'Add your first entry to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={addEntry}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewType === 'table' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {database.properties.map((property) => (
                        <th key={property.id} className="text-left p-4 font-medium">
                          {property.name}
                          {property.required && <span className="text-red-500 ml-1">*</span>}
                        </th>
                      ))}
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-muted/50">
                        {database.properties.map((property) => (
                          <td key={property.id} className="p-4">
                            {renderPropertyValue(property, entry.data[property.name])}
                          </td>
                        ))}
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editEntry(entry)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteEntry(entry.id)}
                                className="text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {viewType === 'list' && (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        {database.properties.slice(0, 3).map((property) => (
                          <div key={property.id} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                              {property.name}:
                            </span>
                            <div className="flex-1">
                              {renderPropertyValue(property, entry.data[property.name])}
                            </div>
                          </div>
                        ))}
                        {database.properties.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            +{database.properties.length - 3} more properties
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editEntry(entry)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {viewType === 'page' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {entry.data[database.properties[0]?.name] || 'Untitled'}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editEntry(entry)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {database.properties.slice(1, 4).map((property) => (
                        <div key={property.id} className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            {property.name}:
                          </span>{' '}
                          {renderPropertyValue(property, entry.data[property.name])}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Entry Editor Dialog */}
      <EntryEditorDialog
        database={database}
        entry={editingEntry}
        isOpen={isAddEntryOpen}
        onClose={() => {
          setIsAddEntryOpen(false)
          setEditingEntry(null)
        }}
        onSave={saveEntry}
      />
    </div>
  )
}

interface EntryEditorDialogProps {
  database: Database
  entry: DatabaseEntry | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => void
}

function EntryEditorDialog({ database, entry, isOpen, onClose, onSave }: EntryEditorDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (entry) {
      setFormData(entry.data)
    } else {
      // Initialize with empty values
      const initialData: Record<string, any> = {}
      database.properties.forEach(property => {
        switch (property.type) {
          case 'checkbox':
            initialData[property.name] = false
            break
          case 'multiSelect':
            initialData[property.name] = []
            break
          case 'rating':
            initialData[property.name] = 0
            break
          default:
            initialData[property.name] = ''
        }
      })
      setFormData(initialData)
    }
  }, [entry, database.properties])

  const handleSave = () => {
    onSave(formData)
  }

  const updateField = (propertyName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [propertyName]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? 'Edit Entry' : 'Add Entry'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {database.properties.map((property) => (
            <div key={property.id}>
              <Label htmlFor={property.id}>
                {property.name}
                {property.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {property.type === 'text' && (
                <Input
                  id={property.id}
                  value={formData[property.name] || ''}
                  onChange={(e) => updateField(property.name, e.target.value)}
                />
              )}
              
              {property.type === 'number' && (
                <Input
                  id={property.id}
                  type="number"
                  value={formData[property.name] || ''}
                  onChange={(e) => updateField(property.name, e.target.value)}
                />
              )}
              
              {property.type === 'date' && (
                <Input
                  id={property.id}
                  type="date"
                  value={formData[property.name] || ''}
                  onChange={(e) => updateField(property.name, e.target.value)}
                />
              )}
              
              {property.type === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={property.id}
                    checked={Boolean(formData[property.name])}
                    onCheckedChange={(checked) => updateField(property.name, checked)}
                  />
                  <Label htmlFor={property.id}>Yes</Label>
                </div>
              )}
              
              {property.type === 'select' && property.options && (
                <Select
                  value={formData[property.name] || ''}
                  onValueChange={(value) => updateField(property.name, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {property.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {(property.type === 'url' || property.type === 'email') && (
                <Input
                  id={property.id}
                  type={property.type}
                  value={formData[property.name] || ''}
                  onChange={(e) => updateField(property.name, e.target.value)}
                />
              )}
              
              {property.type === 'phone' && (
                <Input
                  id={property.id}
                  type="tel"
                  value={formData[property.name] || ''}
                  onChange={(e) => updateField(property.name, e.target.value)}
                />
              )}
              
              {property.type === 'rating' && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => updateField(property.name, rating)}
                      className={`text-2xl ${
                        rating <= (formData[property.name] || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      } hover:text-yellow-400`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {entry ? 'Update' : 'Add'} Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}