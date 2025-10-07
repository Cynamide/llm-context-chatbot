"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { getKnowledgeFiles, deleteKnowledgeFile, getFileContent } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, FileText, RefreshCw, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface KnowledgeFile {
  file_name: string
}

export function KnowledgeList() {
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const { toast } = useToast()

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const result = await getKnowledgeFiles()
      if (result.success && result.files) {
        setFiles(result.files)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load knowledge files",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const handleDelete = async (fileName: string) => {
    setDeletingFile(fileName)
    try {
      const result = await deleteKnowledgeFile(fileName)
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setFiles(files.filter((f) => f.file_name !== fileName))
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setDeletingFile(null)
    }
  }

  const handleViewFile = async (fileName: string) => {
    setSelectedFile(fileName)
    setIsLoadingContent(true)
    setFileContent("")

    try {
      const result = await getFileContent(fileName)
      if (result.success) {
        setFileContent(result.content)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load file content",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      })
    } finally {
      setIsLoadingContent(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {files.length} {files.length === 1 ? "file" : "files"}
          </p>
          <Button variant="ghost" size="sm" onClick={loadFiles} className="text-sidebar-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No knowledge files yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {files.map((file) => (
              <div
                key={file.file_name}
                className="group relative p-4 bg-sidebar-accent rounded-lg border border-sidebar-border hover:border-sidebar-primary/50 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => handleViewFile(file.file_name)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="p-2 bg-sidebar-primary/10 rounded-md flex-shrink-0">
                      <FileText className="w-5 h-5 text-sidebar-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors">
                        {file.file_name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Click to view content
                      </p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(file.file_name)}
                    disabled={deletingFile === file.file_name}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  >
                    {deletingFile === file.file_name ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={selectedFile !== null} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-h-[80vh] flex flex-col bg-sidebar border-sidebar-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sidebar-foreground">
              <FileText className="w-5 h-5 text-sidebar-primary" />
              {selectedFile}
            </DialogTitle>
            <DialogDescription>View and review your knowledge file content</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4 overflow-auto">
            {isLoadingContent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg">
                <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">
                  {fileContent || "No content available"}
                </pre>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
