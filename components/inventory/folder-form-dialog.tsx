"use client"

import React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Folder } from "@/lib/inventory-types"

interface FolderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: Folder | null
  folders: Folder[]
  onSave: (data: Omit<Folder, "id" | "createdAt" | "itemCount">) => void
}

const FOLDER_COLORS = [
  { name: "Blue", value: "#4F46E5" },
  { name: "Green", value: "#10B981" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Red", value: "#EF4444" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Orange", value: "#F97316" },
]

export function FolderFormDialog({ open, onOpenChange, folder, folders, onSave }: FolderFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    parentId: null as string | null,
    color: FOLDER_COLORS[0].value,
  })

  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name,
        parentId: folder.parentId,
        color: folder.color,
      })
    } else {
      setFormData({
        name: "",
        parentId: null,
        color: FOLDER_COLORS[0].value,
      })
    }
  }, [folder, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onOpenChange(false)
  }

  // Filter out the current folder and its children to prevent circular references
  const availableParentFolders = folders.filter((f) => {
    if (!folder) return !f.parentId // Only root folders can be parents for new folders
    return f.id !== folder.id && f.parentId !== folder.id && !f.parentId // Only root folders
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{folder ? "Edit Folder" : "Create New Folder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name *</Label>
            <Input
              id="folderName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Electronics"
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    formData.color === color.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {availableParentFolders.length > 0 && (
            <div className="space-y-2">
              <Label>Parent Folder (Optional)</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root folder)</SelectItem>
                  {availableParentFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded" style={{ backgroundColor: f.color }} />
                        {f.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px] w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="min-h-[44px] w-full sm:w-auto">{folder ? "Save Changes" : "Create Folder"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
