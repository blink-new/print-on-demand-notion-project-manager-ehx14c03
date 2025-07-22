import { useState, useEffect } from 'react'
import { Plus, Settings, Trash2, GripVertical, Type, Hash, Calendar, CheckSquare, Link, Star, Image, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { blink } from '@/blink/client'
import type { Database, DatabaseProperty } from '@/types'

interface DatabaseBuilderProps {
  database?: Database
  projectId?: string
  onSave: (database: Database) => void
  onCancel: () => void
}

export function DatabaseBuilder({ database, projectId, onSave, onCancel }: DatabaseBuilderProps) {
  const [name, setName] = useState(database?.name || '')
  const [description, setDescription] = useState(database?.description || '')
  const [viewType, setViewType] = useState<'table' | 'list' | 'page'>(database?.viewType || 'table')
  const [properties, setProperties] = useState<DatabaseProperty[]>(database?.properties || [])
  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<DatabaseProperty | null>(null)

  const propertyTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { value: 'select', label: 'Select', icon: Settings },
    { value: 'multiSelect', label: 'Multi-select', icon: Settings },
    { value: 'url', label: 'URL', icon: Link },
    { value: 'email', label: 'Email', icon: Type },
    { value: 'phone', label: 'Phone', icon: Type },
    { value: 'rating', label: 'Rating', icon: Star },
    { value: 'file', label: 'File', icon: FileText },
    { value: 'image', label: 'Image', icon: Image },
  ]

  const addProperty = () => {
    setEditingProperty({
      id: `prop-${Date.now()}`,
      name: '',
      type: 'text',
      required: false
    })
    setIsPropertyDialogOpen(true)
  }

  const editProperty = (property: DatabaseProperty) => {
    setEditingProperty(property)
    setIsPropertyDialogOpen(true)
  }

  const saveProperty = (property: DatabaseProperty) => {
    if (properties.find(p => p.id === property.id)) {
      setProperties(prev => prev.map(p => p.id === property.id ? property : p))
    } else {
      setProperties(prev => [...prev, property])
    }
    setIsPropertyDialogOpen(false)
    setEditingProperty(null)
  }

  const deleteProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId))
  }

  const moveProperty = (propertyId: string, direction: 'up' | 'down') => {
    setProperties(prev => {
      const index = prev.findIndex(p => p.id === propertyId)
      if (index === -1) return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newProperties = [...prev]
      const [movedProperty] = newProperties.splice(index, 1)
      newProperties.splice(newIndex, 0, movedProperty)
      return newProperties
    })
  }

  const handleSave = async () => {
    if (!name.trim()) return

    try {
      const user = await blink.auth.me()
      const now = new Date().toISOString()

      const databaseData = {
        id: database?.id || `db-${Date.now()}`,
        projectId,
        userId: user.id,
        name,
        description,
        viewType,
        properties: JSON.stringify(properties),
        createdAt: database?.createdAt || now,
        updatedAt: now
      }

      if (database?.id) {
        await blink.db.databases.update(database.id, {
          name,
          description,
          viewType,
          properties: JSON.stringify(properties),
          updatedAt: now
        })
      } else {
        await blink.db.databases.create(databaseData)
      }

      onSave({
        ...databaseData,
        properties
      })
    } catch (error) {
      console.error('Failed to save database:', error)
    }
  }

  const getPropertyIcon = (type: string) => {
    const propertyType = propertyTypes.find(pt => pt.value === type)
    return propertyType?.icon || Type
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {database ? 'Edit Database' : 'Create Database'}
          </h2>
          <p className="text-muted-foreground">
            Design your custom database with properties and views
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {database ? 'Update' : 'Create'} Database
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Database Settings */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Database name..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your database..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="viewType">Default View</Label>
                <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="page">Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Properties</CardTitle>
              <Button onClick={addProperty} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No properties yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add properties to define the structure of your database
                  </p>
                  <Button onClick={addProperty}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Property
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {properties.map((property, index) => {
                    const Icon = getPropertyIcon(property.type)
                    return (
                      <div
                        key={property.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{property.name}</span>
                            {property.required && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{property.type}</span>
                            {property.options && property.options.length > 0 && (
                              <span>• {property.options.length} options</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveProperty(property.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveProperty(property.id, 'down')}
                            disabled={index === properties.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editProperty(property)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteProperty(property.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Property Editor Dialog */}
      <PropertyEditorDialog
        property={editingProperty}
        isOpen={isPropertyDialogOpen}
        onClose={() => {
          setIsPropertyDialogOpen(false)
          setEditingProperty(null)
        }}
        onSave={saveProperty}
        propertyTypes={propertyTypes}
      />
    </div>
  )
}

interface PropertyEditorDialogProps {
  property: DatabaseProperty | null
  isOpen: boolean
  onClose: () => void
  onSave: (property: DatabaseProperty) => void
  propertyTypes: Array<{ value: string; label: string; icon: any }>
}

function PropertyEditorDialog({ 
  property, 
  isOpen, 
  onClose, 
  onSave, 
  propertyTypes 
}: PropertyEditorDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<DatabaseProperty['type']>('text')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    if (property) {
      setName(property.name)
      setType(property.type)
      setRequired(property.required || false)
      setOptions(property.options || [])
    } else {
      setName('')
      setType('text')
      setRequired(false)
      setOptions([])
    }
    setNewOption('')
  }, [property])

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions(prev => [...prev, newOption.trim()])
      setNewOption('')
    }
  }

  const removeOption = (option: string) => {
    setOptions(prev => prev.filter(o => o !== option))
  }

  const handleSave = () => {
    if (!name.trim()) return

    const savedProperty: DatabaseProperty = {
      id: property?.id || `prop-${Date.now()}`,
      name: name.trim(),
      type,
      required,
      ...(type === 'select' || type === 'multiSelect' ? { options } : {})
    }

    onSave(savedProperty)
  }

  const needsOptions = type === 'select' || type === 'multiSelect'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {property ? 'Edit Property' : 'Add Property'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="propertyName">Property Name</Label>
            <Input
              id="propertyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Property name..."
            />
          </div>

          <div>
            <Label htmlFor="propertyType">Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((propertyType) => {
                  const Icon = propertyType.icon
                  return (
                    <SelectItem key={propertyType.value} value={propertyType.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {propertyType.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={required}
              onCheckedChange={setRequired}
            />
            <Label htmlFor="required">Required field</Label>
          </div>

          {needsOptions && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add option..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addOption()
                      }
                    }}
                  />
                  <Button onClick={addOption} size="sm">
                    Add
                  </Button>
                </div>
                {options.length > 0 && (
                  <div className="space-y-1">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{option}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeOption(option)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {property ? 'Update' : 'Add'} Property
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}