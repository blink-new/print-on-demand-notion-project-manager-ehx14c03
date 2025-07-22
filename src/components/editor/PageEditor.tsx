import { useState, useEffect, useCallback } from 'react'
import { Plus, Type, Heading1, Heading2, Heading3, Image, Database, Grid, Link, Minus, Quote, Code, Video, FileText, Columns, AlignLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { blink } from '@/blink/client'
import type { Page, Block, TextBlock, HeadingBlock, ImageBlock, Database } from '@/types'

interface PageEditorProps {
  page: Page
  onSave: (page: Page) => void
  onTitleChange: (title: string) => void
}

export function PageEditor({ page, onSave, onTitleChange }: PageEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(page.title)
  const [databases, setDatabases] = useState<Database[]>([])
  const [assets, setAssets] = useState<any[]>([])

  // Load page data and related resources
  useEffect(() => {
    const loadPageData = async () => {
      try {
        // Parse content into blocks
        const parsedBlocks = page.content ? JSON.parse(page.content) : []
        setBlocks(Array.isArray(parsedBlocks) ? parsedBlocks : [])
        
        // Load databases for this project
        if (page.projectId) {
          const user = await blink.auth.me()
          const databasesData = await blink.db.databases.list({
            where: { projectId: page.projectId, userId: user.id }
          })
          
          const parsedDatabases = databasesData.map(db => ({
            ...db,
            properties: typeof db.properties === 'string' ? JSON.parse(db.properties) : db.properties
          }))
          
          setDatabases(parsedDatabases)
          
          // Load project assets
          const assetsData = await blink.db.assets.list({
            where: { projectId: page.projectId, userId: user.id },
            orderBy: { createdAt: 'desc' },
            limit: 20
          })
          setAssets(assetsData)
        }
      } catch (error) {
        console.error('Failed to load page data:', error)
        // If content is markdown/text, create a single text block
        setBlocks([{
          id: 'block-1',
          type: 'text',
          content: { text: page.content || '', format: 'paragraph' },
          position: 0
        }])
      }
    }
    
    loadPageData()
  }, [page.content, page.projectId])

  const getDefaultContent = (type: Block['type']) => {
    switch (type) {
      case 'text':
        return { text: '', format: 'paragraph' }
      case 'heading':
        return { text: '', level: 1 }
      case 'image':
        return { url: '', caption: '', alt: '' }
      case 'database':
        return { databaseId: '', viewType: 'table' }
      case 'gallery':
        return { assets: [], layout: 'grid' }
      case 'embed':
        return { url: '', title: '', description: '' }
      case 'divider':
        return {}
      default:
        return {}
    }
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    onTitleChange(newTitle)
  }

  const addBlock = (type: Block['type'], position?: number) => {
    const newPosition = position ?? blocks.length
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      position: newPosition,
      content: getDefaultContent(type)
    }

    const updatedBlocks = [...blocks]
    updatedBlocks.splice(newPosition, 0, newBlock)
    
    // Update positions
    updatedBlocks.forEach((block, index) => {
      block.position = index
    })

    setBlocks(updatedBlocks)
    setIsEditing(true)
  }

  const updateBlock = (blockId: string, content: any) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, content } : block
    ))
    setIsEditing(true)
  }

  const deleteBlock = (blockId: string) => {
    setBlocks(prev => {
      const filtered = prev.filter(block => block.id !== blockId)
      return filtered.map((block, index) => ({ ...block, position: index }))
    })
    setIsEditing(true)
  }

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const blockIndex = prev.findIndex(block => block.id === blockId)
      if (blockIndex === -1) return prev

      const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newBlocks = [...prev]
      const [movedBlock] = newBlocks.splice(blockIndex, 1)
      newBlocks.splice(newIndex, 0, movedBlock)

      return newBlocks.map((block, index) => ({ ...block, position: index }))
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      const updatedPage = {
        ...page,
        title,
        content: JSON.stringify(blocks),
        updatedAt: new Date().toISOString()
      }

      await blink.db.pages.update(page.id, {
        title,
        content: JSON.stringify(blocks),
        updatedAt: new Date().toISOString()
      })

      onSave(updatedPage)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save page:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page Title */}
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-3xl font-bold border-none p-0 focus-visible:ring-0 bg-transparent"
          placeholder="Untitled"
        />
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Content Blocks */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <BlockRenderer
            key={block.id}
            block={block}
            onUpdate={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, 'up')}
            onMoveDown={() => moveBlock(block.id, 'down')}
            onAddBlock={(type) => addBlock(type, index + 1)}
            canMoveUp={index > 0}
            canMoveDown={index < blocks.length - 1}
          />
        ))}
      </div>

      {/* Add Block Menu */}
      <AddBlockMenu onAddBlock={(type) => addBlock(type)} />
    </div>
  )
}

interface BlockRendererProps {
  block: Block
  onUpdate: (content: any) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddBlock: (type: Block['type']) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function BlockRenderer({ 
  block, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  onAddBlock,
  canMoveUp,
  canMoveDown 
}: BlockRendererProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Block Controls */}
      {isHovered && (
        <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          >
            ↓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            onClick={onDelete}
          >
            ×
          </Button>
        </div>
      )}

      {/* Block Content */}
      <div className="min-h-[40px]">
        {block.type === 'text' && (
          <TextBlockEditor
            block={block as TextBlock}
            onUpdate={onUpdate}
          />
        )}
        {block.type === 'heading' && (
          <HeadingBlockEditor
            block={block as HeadingBlock}
            onUpdate={onUpdate}
          />
        )}
        {block.type === 'image' && (
          <ImageBlockEditor
            block={block as ImageBlock}
            onUpdate={onUpdate}
          />
        )}
        {block.type === 'divider' && (
          <Separator className="my-4" />
        )}
        {block.type === 'database' && (
          <DatabaseBlockEditor
            block={block as any}
            databases={databases}
            onUpdate={onUpdate}
          />
        )}
        {block.type === 'gallery' && (
          <Card className="p-4">
            <p className="text-muted-foreground">Gallery block - Coming soon</p>
          </Card>
        )}
        {block.type === 'embed' && (
          <Card className="p-4">
            <p className="text-muted-foreground">Embed block - Coming soon</p>
          </Card>
        )}
      </div>

      {/* Add Block Button */}
      {isHovered && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <AddBlockButton onAddBlock={onAddBlock} />
        </div>
      )}
    </div>
  )
}

function TextBlockEditor({ block, onUpdate }: { block: TextBlock; onUpdate: (content: any) => void }) {
  return (
    <div className="space-y-2">
      <Select
        value={block.content.format}
        onValueChange={(format) => onUpdate({ ...block.content, format })}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="quote">Quote</SelectItem>
          <SelectItem value="code">Code</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        value={block.content.text}
        onChange={(e) => onUpdate({ ...block.content, text: e.target.value })}
        placeholder="Type something..."
        className={`min-h-[100px] resize-none ${
          block.content.format === 'quote' ? 'border-l-4 border-primary pl-4 italic' :
          block.content.format === 'code' ? 'font-mono bg-muted' : ''
        }`}
      />
    </div>
  )
}

function HeadingBlockEditor({ block, onUpdate }: { block: HeadingBlock; onUpdate: (content: any) => void }) {
  return (
    <div className="space-y-2">
      <Select
        value={block.content.level.toString()}
        onValueChange={(level) => onUpdate({ ...block.content, level: parseInt(level) })}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Heading 1</SelectItem>
          <SelectItem value="2">Heading 2</SelectItem>
          <SelectItem value="3">Heading 3</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={block.content.text}
        onChange={(e) => onUpdate({ ...block.content, text: e.target.value })}
        placeholder="Heading text..."
        className={`border-none p-0 focus-visible:ring-0 bg-transparent ${
          block.content.level === 1 ? 'text-3xl font-bold' :
          block.content.level === 2 ? 'text-2xl font-semibold' :
          'text-xl font-medium'
        }`}
      />
    </div>
  )
}

function ImageBlockEditor({ block, onUpdate }: { block: ImageBlock; onUpdate: (content: any) => void }) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true)
      const { publicUrl } = await blink.storage.upload(file, `images/${file.name}`, { upsert: true })
      onUpdate({ ...block.content, url: publicUrl, alt: file.name })
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="p-4 space-y-4">
      {block.content.url ? (
        <div className="space-y-2">
          <img 
            src={block.content.url} 
            alt={block.content.alt || 'Image'} 
            className="max-w-full h-auto rounded-md"
          />
          <Input
            value={block.content.caption || ''}
            onChange={(e) => onUpdate({ ...block.content, caption: e.target.value })}
            placeholder="Add a caption..."
            className="text-sm text-muted-foreground"
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Upload an image or paste a URL</p>
            <div className="flex gap-2 justify-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
                className="hidden"
                id={`image-upload-${block.id}`}
              />
              <label htmlFor={`image-upload-${block.id}`}>
                <Button variant="outline" size="sm" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </label>
              <Input
                placeholder="Or paste image URL..."
                className="w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = e.currentTarget.value
                    if (url) onUpdate({ ...block.content, url })
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function AddBlockButton({ onAddBlock }: { onAddBlock: (type: Block['type']) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="h-6 w-6 p-0 rounded-full bg-background border-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus className="h-3 w-3" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-background border rounded-md shadow-lg p-2 z-10">
          <div className="grid grid-cols-3 gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onAddBlock('text'); setIsOpen(false) }}
              className="flex flex-col h-12 w-12 p-1"
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Text</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onAddBlock('heading'); setIsOpen(false) }}
              className="flex flex-col h-12 w-12 p-1"
            >
              <Heading1 className="h-4 w-4" />
              <span className="text-xs">Head</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onAddBlock('image'); setIsOpen(false) }}
              className="flex flex-col h-12 w-12 p-1"
            >
              <Image className="h-4 w-4" />
              <span className="text-xs">Image</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onAddBlock('database'); setIsOpen(false) }}
              className="flex flex-col h-12 w-12 p-1"
            >
              <Database className="h-4 w-4" />
              <span className="text-xs">DB</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onAddBlock('gallery'); setIsOpen(false) }}
              className="flex flex-col h-12 w-12 p-1"
            >
              <Grid className="h-4 w-4" />
              <span className="text-xs">Gallery</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onAddBlock('divider'); setIsOpen(false) }}
              className="flex flex-col h-12 w-12 p-1"
            >
              <Minus className="h-4 w-4" />
              <span className="text-xs">Divider</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DatabaseBlockEditor({ block, databases, onUpdate }: { 
  block: any; 
  databases: Database[]; 
  onUpdate: (content: any) => void 
}) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const selectedDatabase = databases.find(db => db.id === block.content.databaseId)
  
  useEffect(() => {
    const loadEntries = async () => {
      if (!selectedDatabase) return
      
      try {
        setLoading(true)
        const entriesData = await blink.db.databaseEntries.list({
          where: { databaseId: selectedDatabase.id },
          orderBy: { createdAt: 'desc' },
          limit: 5
        })
        
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
    }
    
    loadEntries()
  }, [selectedDatabase])
  
  if (!block.content.databaseId) {
    return (
      <Card className="p-4">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base">Select Database</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {databases.length === 0 ? (
            <p className="text-muted-foreground text-sm">No databases available in this project</p>
          ) : (
            <Select
              value=""
              onValueChange={(databaseId) => onUpdate({ ...block.content, databaseId })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a database..." />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.id} value={db.id}>
                    {db.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
    )
  }
  
  if (!selectedDatabase) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground">Database not found</p>
      </Card>
    )
  }
  
  return (
    <Card className="p-4">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{selectedDatabase.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={block.content.viewType || 'table'}
              onValueChange={(viewType) => onUpdate({ ...block.content, viewType })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ ...block.content, databaseId: '' })}
            >
              Change
            </Button>
          </div>
        </div>
        {selectedDatabase.description && (
          <p className="text-sm text-muted-foreground">{selectedDatabase.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Database className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No entries in this database</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded p-3 hover:bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedDatabase.properties.slice(0, 4).map((property) => (
                    <div key={property.id}>
                      <span className="font-medium text-muted-foreground">{property.name}:</span>{' '}
                      <span>{entry.data[property.name] || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {entries.length >= 5 && (
              <div className="text-center pt-2">
                <Badge variant="secondary" className="text-xs">
                  Showing first 5 entries
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddBlockMenu({ onAddBlock }: { onAddBlock: (type: Block['type']) => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Plus className="h-4 w-4" />
        <span className="text-sm">Add a block</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('text')}
          className="justify-start"
        >
          <Type className="mr-2 h-4 w-4" />
          Text
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('heading')}
          className="justify-start"
        >
          <Heading1 className="mr-2 h-4 w-4" />
          Heading
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('image')}
          className="justify-start"
        >
          <Image className="mr-2 h-4 w-4" />
          Image
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('database')}
          className="justify-start"
        >
          <Database className="mr-2 h-4 w-4" />
          Database
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('gallery')}
          className="justify-start"
        >
          <Grid className="mr-2 h-4 w-4" />
          Gallery
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('embed')}
          className="justify-start"
        >
          <Link className="mr-2 h-4 w-4" />
          Embed
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock('divider')}
          className="justify-start"
        >
          <Minus className="mr-2 h-4 w-4" />
          Divider
        </Button>
      </div>
    </Card>
  )
}