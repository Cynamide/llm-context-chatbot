"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadKnowledge } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, FileText, PenSquare } from "lucide-react"

export function FileUpload() {
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [fileName, setFileName] = useState("")
  const [content, setContent] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      let text: string

      // Check if file is PDF
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        toast({
          title: "Processing PDF",
          description: "Extracting text from PDF file...",
        })
        console.log("PDF upload not implemented yet")
        // throw error to indicate PDF handling is not implemented
        throw new Error("PDF upload not implemented yet")
      } else {
        text = await file.text()
      }

      const result = await uploadKnowledge([{ file_name: file.name, text }])
      if (result.success) {
        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
        })
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName || !content) {
      toast({
        title: "Error",
        description: "Please provide both name and content",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadKnowledge([{ file_name: fileName, text: content }])
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setFileName("")
        setContent("")
        setShowCustomModal(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".txt,.md,.json,.csv,.pdf"
          disabled={isUploading}
          className="hidden"
          id="file-upload-input"
        />
        <label
          htmlFor="file-upload-input"
          className={`w-full p-6 rounded-lg border border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors text-left group block ${
            isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-sidebar-primary/10 group-hover:bg-sidebar-primary/20 transition-colors">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-sidebar-primary animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-sidebar-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sidebar-foreground mb-1">
                {isUploading ? "Uploading..." : "Upload a File"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload .txt, .md, .json, .csv files to add to your knowledge base. <br/> PDFs coming soon! 
              </p>
            </div>
          </div>
        </label>

        <button
          onClick={() => setShowCustomModal(true)}
          className="w-full p-6 rounded-lg border border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-sidebar-primary/10 group-hover:bg-sidebar-primary/20 transition-colors">
              <PenSquare className="w-6 h-6 text-sidebar-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sidebar-foreground mb-1">Add Custom Knowledge</h3>
              <p className="text-sm text-muted-foreground">Manually enter knowledge with a custom name and content</p>
            </div>
          </div>
        </button>
      </div>

      <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
        <DialogContent className="bg-sidebar border-sidebar-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sidebar-foreground">Add Custom Knowledge</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-name" className="text-sidebar-foreground">
                Knowledge Name
              </Label>
              <Input
                id="custom-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., company-policies.txt"
                className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-content" className="text-sidebar-foreground">
                Content
              </Label>
              <Textarea
                id="custom-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your knowledge content here..."
                rows={12}
                className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground font-mono text-sm resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomModal(false)}
                disabled={isUploading}
                className="border-sidebar-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading}
                className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Add Knowledge
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
