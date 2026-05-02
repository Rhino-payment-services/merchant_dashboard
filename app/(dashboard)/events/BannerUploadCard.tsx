"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Image, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/config"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

function resolveBannerSrc(bannerUrl: string): string {
  const t = bannerUrl.trim()
  if (!t) return ""
  if (t.startsWith("http://") || t.startsWith("https://")) return t
  const base = API_URL.replace(/\/$/, "")
  const path = t.startsWith("/") ? t : `/${t}`
  return `${base}${path}`
}

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "Image must be under 5MB."
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only JPEG, PNG, WebP, and GIF images are supported."
  }
  return null
}

export type BannerUploadCardProps = {
  value: string
  selectedFile: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

export function BannerUploadCard({
  value,
  selectedFile,
  onFileChange,
  disabled,
}: BannerUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const selectedPreviewUrl = useMemo(() => {
    if (!selectedFile) return ""
    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl)
    }
  }, [selectedPreviewUrl])

  const displaySrc = selectedPreviewUrl || (value ? resolveBannerSrc(value) : "")
  const hasImage = Boolean(displaySrc)

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length || disabled) return
    const file = files[0]
    const err = validateFile(file)
    if (err) {
      toast.error(err)
      return
    }
    onFileChange(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    onPickFiles(e.dataTransfer.files)
  }

  const handleRemove = () => {
    if (disabled) return
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        className="sr-only"
        aria-label="Choose event banner image"
        disabled={disabled}
        onChange={(e) => onPickFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (!disabled) inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "copy"
        }}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click()
        }}
        className={[
          "group relative overflow-hidden rounded-xl border-2 border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/30",
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
          hasImage ? "aspect-[21/9] min-h-[140px]" : "aspect-[21/9] min-h-[160px]",
        ].join(" ")}
      >
        {!hasImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
              <Image className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">Drop your banner here</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              or click to browse — JPEG, PNG, WebP, or GIF, up to 5MB
            </p>
            <Button type="button" variant="secondary" size="sm" className="pointer-events-none mt-1 gap-2">
              <Upload className="h-4 w-4" aria-hidden />
              Choose image
            </Button>
          </div>
        ) : null}

        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt=""
              className="h-full w-full object-cover"
            />
          </>
        ) : null}

        {hasImage ? (
          <div className="absolute right-2 top-2 flex gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 shadow-md pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) inputRef.current?.click()
              }}
              disabled={disabled}
              aria-label="Replace banner"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 text-destructive shadow-md pointer-events-auto hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              disabled={disabled}
              aria-label="Remove banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {selectedFile ? (
        <p className="text-xs text-muted-foreground truncate" title={selectedFile.name}>
          Selected: {selectedFile.name}
        </p>
      ) : value ? (
        <p className="text-xs text-muted-foreground truncate" title={value}>
          Current: {value}
        </p>
      ) : null}
    </div>
  )
}
