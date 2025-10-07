"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileUpload } from "@/components/file-upload"
import { KnowledgeList } from "@/components/knowledge-list"
import { Upload, Database, ChevronLeft, ChevronRight } from "lucide-react"

export function KnowledgeDrawer() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"upload" | "knowledge">("upload")

  return (
    <>
      <aside
        className={`${
          isOpen ? "w-80" : "w-0"
        } transition-all duration-300 border-r border-border bg-sidebar flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Knowledge Base</h2>
        </div>

        <div className="flex border-b border-sidebar-border">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-b-2 border-sidebar-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            }`}
          >
            <Upload className="w-4 h-4 inline-block mr-2" />
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "knowledge"
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-b-2 border-sidebar-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            }`}
          >
            <Database className="w-4 h-4 inline-block mr-2" />
            Knowledge
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">{activeTab === "upload" ? <FileUpload /> : <KnowledgeList />}</div>
        </ScrollArea>
      </aside>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card border border-border rounded-r-lg rounded-l-none h-16 w-6 hover:w-8 transition-all"
        style={{ left: isOpen ? "320px" : "0px" }}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>
    </>
  )
}
