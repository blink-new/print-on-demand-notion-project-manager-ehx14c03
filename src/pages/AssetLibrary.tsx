import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Search, Grid, List, Filter, MoreHorizontal, Download, Eye, Trash2, Tag, FolderPlus, Image, Video, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layout } from '@/components/layout/Layout'
import { blink } from '@/blink/client'
import type { Asset, AssetAlbum } from '@/types'

interface Folder {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

const AssetLibrary: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [albums, setAlbums] = useState<AssetAlbum[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  // New album form
  const [newAlbum, setNewAlbum] = useState({
    name: '',
    description: ''
  })

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true)
      const assetsData = await blink.db.assets.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' }
      })
      setAssets(assetsData)
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const loadAlbums = useCallback(async () => {
    try {
      const albumsData = await blink.db.assetAlbums.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' }
      })
      setAlbums(albumsData)
    } catch (error) {
      console.error('Failed to load albums:', error)
    }
  }, [user?.id])

  const loadFolders = useCallback(async () => {
    try {
      const foldersData = await blink.db.folders.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' }
      })
      setFolders(foldersData)
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }, [user?.id])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadAssets()
        loadAlbums()
        loadFolders()
      }
    })
    return unsubscribe
  }, [loadAssets, loadAlbums, loadFolders])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadFiles(files)
    setIsUploadDialogOpen(true)
  }

  const handleUpload = async () => {
    if (!user || uploadFiles.length === 0) return

    try {
      for (const file of uploadFiles) {
        const fileId = `${Date.now()}-${file.name}`
        
        // Upload to storage
        const { publicUrl } = await blink.storage.upload(
          file,
          `assets/${user.id}/${fileId}`,
          {
            onProgress: (percent) => {
              setUploadProgress(prev => ({ ...prev, [fileId]: percent }))
            }
          }
        )

        // Save asset metadata to database
        await blink.db.assets.create({
          originalName: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          userId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      // Reload assets
      await loadAssets()
      setUploadFiles([])
      setUploadProgress({})
      setIsUploadDialogOpen(false)
    } catch (error) {
      console.error('Failed to upload assets:', error)
    }
  }

  const handleCreateAlbum = async () => {
    if (!newAlbum.name.trim() || !user) return

    try {
      await blink.db.assetAlbums.create({
        name: newAlbum.name,
        description: newAlbum.description,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      await loadAlbums()
      setNewAlbum({ name: '', description: '' })
      setIsCreateAlbumOpen(false)
    } catch (error) {
      console.error('Failed to create album:', error)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-green-100 text-green-800'
    if (type.startsWith('video/')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.originalName.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = selectedFilter === 'all' ||
                         (selectedFilter === 'images' && asset.type.startsWith('image/')) ||
                         (selectedFilter === 'videos' && asset.type.startsWith('video/')) ||
                         (selectedFilter === 'documents' && !asset.type.startsWith('image/') && !asset.type.startsWith('video/'))
    
    return matchesSearch && matchesFilter
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Loading...</h3>
          <p className="text-gray-500">Please wait while we load your assets.</p>
        </div>
      </div>
    )
  }

  return (
    <Layout title="Asset Library" subtitle="Organize and manage your design assets">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Library</h1>
            <p className="text-gray-600">Organize and manage your design assets</p>
          </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                New Album
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Album</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="albumName">Album Name</Label>
                  <Input
                    id="albumName"
                    value={newAlbum.name}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter album name..."
                  />
                </div>
                <div>
                  <Label htmlFor="albumDescription">Description</Label>
                  <Textarea
                    id="albumDescription"
                    value={newAlbum.description}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this album..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateAlbumOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAlbum} disabled={!newAlbum.name.trim()}>
                    Create Album
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload Assets
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assets">All Assets</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedFilter} onValueChange={(value: any) => setSelectedFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-1 border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Assets Grid/List */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assets yet</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No assets match your search.' : 'Upload your first design assets to get started.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Asset
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {asset.type.startsWith('image/') ? (
                            <img
                              src={asset.url}
                              alt={asset.originalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400">
                              {getFileIcon(asset.type)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {asset.originalName}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge className={getFileTypeColor(asset.type)} variant="secondary">
                              {asset.type.split('/')[0]}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Tag className="w-4 h-4 mr-2" />
                                  Add Tags
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(asset.size)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {asset.type.startsWith('image/') ? (
                            <img
                              src={asset.url}
                              alt={asset.originalName}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            getFileIcon(asset.type)
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{asset.originalName}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Badge className={getFileTypeColor(asset.type)} variant="secondary">
                              {asset.type.split('/')[0]}
                            </Badge>
                            <span>{formatFileSize(asset.size)}</span>
                            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className="w-4 h-4 mr-2" />
                              Add Tags
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="albums" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <Card key={album.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{album.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Album</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {album.description && (
                    <p className="text-sm text-gray-600 mb-4">{album.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    0 assets • Created {new Date(album.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="folders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Folder</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {folder.description && (
                    <p className="text-sm text-gray-600 mb-4">{folder.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    0 assets • Created {new Date(folder.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Assets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {uploadFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file.type)}
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploadFiles.length === 0}>
                Upload {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  )
}

export default AssetLibrary