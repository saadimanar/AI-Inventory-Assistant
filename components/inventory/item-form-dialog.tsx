"use client"

import React from "react"

import { useState, useEffect } from "react"
import { X, Upload, Plus, Trash2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { InventoryItem, Folder } from "@/lib/inventory-types"
import { createClient } from "@/utils/supabase/client"

interface ItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  folders: Folder[]
  onSave: (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void
}

export function ItemFormDialog({ open, onOpenChange, item, folders, onSave }: ItemFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 0,
    minQuantity: 5,
    price: 0,
    sku: "",
    folderId: null as string | null,
    tags: [] as string[],
    imageUrl: null as string | null,
  })
  const [tagInput, setTagInput] = useState("")
  const [quantityInputValue, setQuantityInputValue] = useState("")
  const [minQuantityInputValue, setMinQuantityInputValue] = useState("")
  const [priceInputValue, setPriceInputValue] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        price: item.price,
        sku: item.sku,
        folderId: item.folderId,
        tags: item.tags,
        imageUrl: item.imageUrl,
      })
      setPriceInputValue(item.price.toString())
      setQuantityInputValue(item.quantity.toString())
      setMinQuantityInputValue(item.minQuantity.toString())
      setImagePreview(item.imageUrl)
      setImageFile(null)
    } else {
      setFormData({
        name: "",
        description: "",
        quantity: 0,
        minQuantity: 5,
        price: 0,
        sku: "",
        folderId: null,
        tags: [],
        imageUrl: null,
      })
      setPriceInputValue("")
      setQuantityInputValue("")
      setMinQuantityInputValue("5")
      setImagePreview(null)
      setImageFile(null)
    }
    setTagInput("")
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      let finalImageUrl = formData.imageUrl

      // Upload new image if a file was selected
      if (imageFile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error("User not authenticated")
        }

        // Generate unique filename
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${user.id}/${item?.id || `temp-${Date.now()}`}/${Date.now()}.${fileExt}`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(fileName)

        finalImageUrl = urlData.publicUrl

        // If editing and had an old image, delete it
        if (item?.imageUrl && item.imageUrl !== finalImageUrl) {
          try {
            const oldUrl = new URL(item.imageUrl)
            const pathParts = oldUrl.pathname.split("/")
            const pathIndex = pathParts.indexOf("item-images")
            if (pathIndex !== -1) {
              const oldImagePath = pathParts.slice(pathIndex + 1).join("/")
              await supabase.storage.from("item-images").remove([oldImagePath])
            }
          } catch (err) {
            console.error("Error deleting old image:", err)
            // Don't fail if old image deletion fails
          }
        }
      }

      // Save item with the image URL
      onSave({
        ...formData,
        imageUrl: finalImageUrl,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving item:", error)
      alert(error instanceof Error ? error.message : "Failed to save item")
    } finally {
      setIsUploading(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tagToRemove) })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData({ ...formData, imageUrl: null })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-muted-foreground hover:text-foreground">
                    <Upload className="h-6 w-6" />
                    <span className="mt-1 text-xs">Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload a photo of your item. Recommended size: 400x300px
                </p>
                {imageFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., ELEC-001"
                className="w-full"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description..."
              rows={3}
              className="w-full min-w-0"
            />
          </div>

          {/* Quantity & Price */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantityInputValue}
                onChange={(e) => {
                  const raw = e.target.value
                  setQuantityInputValue(raw)
                  const num = parseInt(raw, 10)
                  setFormData((prev) => ({ ...prev, quantity: Number.isNaN(num) ? 0 : num }))
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minQuantity">Min. Quantity</Label>
              <Input
                id="minQuantity"
                type="number"
                min="0"
                value={minQuantityInputValue}
                onChange={(e) => {
                  const raw = e.target.value
                  setMinQuantityInputValue(raw)
                  const num = parseInt(raw, 10)
                  setFormData((prev) => ({ ...prev, minQuantity: Number.isNaN(num) ? 0 : num }))
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={priceInputValue}
                onChange={(e) => {
                  const raw = e.target.value
                  setPriceInputValue(raw)
                  const num = parseFloat(raw)
                  setFormData((prev) => ({ ...prev, price: Number.isNaN(num) ? 0 : num }))
                }}
                required
              />
            </div>
          </div>

          {/* Folder Selection */}
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select
              value={formData.folderId || "none"}
              onValueChange={(value) => setFormData({ ...formData, folderId: value === "none" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded" style={{ backgroundColor: folder.color }} />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                className="min-w-0 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addTag} className="min-h-[44px] shrink-0 sm:w-auto">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading} className="min-h-[44px] w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading} className="min-h-[44px] w-full sm:w-auto">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {item ? "Saving..." : "Adding..."}
                </>
              ) : (
                item ? "Save Changes" : "Add Item"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
