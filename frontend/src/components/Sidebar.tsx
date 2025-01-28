import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, File, FileText, FileSpreadsheet, Image, BookOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { v4 as uuidv4 } from "uuid";
import pdfToText from "react-pdftotext";



type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
}

type CustomText = {
  id: string
  title: string
  content: string
}

export function Sidebar() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [customTexts, setCustomTexts] = useState<CustomText[]>([])
  const [selectedText, setSelectedText] = useState<CustomText | null>(null)
  const [isAddingText, setIsAddingText] = useState(false)
  const [newTextTitle, setNewTextTitle] = useState("")
  const [newTextContent, setNewTextContent] = useState("")

  const baseUrl = import.meta.env.VITE_BACKEND_URL;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const uploadedFiles = event.target.files;
  if (!uploadedFiles) return;

  for (const file of uploadedFiles) {
    if (files.some(f => f.name === file.name)) {
      console.log("File already exists:", file.name);
      continue;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      let content = e.target?.result as string;

      if (file.type == "application/pdf"){
        try {
          // Wait for pdfToText to extract text
          content = await pdfToText(file);
        } catch (error) {
          console.error("Failed to extract text from PDF:", error);
          return; // Exit early if there's an error
    }
      }

      console.log(content,file.type)
      
      
      try {
        const id = uuidv4()
        const response = await fetch(`${baseUrl}/upload-files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: id,
            document: content,
            filename: file.name,
            size: file.size.toString(),
            type: file.type
          }),
        });

        if (response.ok) {
          const newFile: UploadedFile = {
            id: id,
            name: file.name,
            size: file.size,
            type: file.type
          };
          setFiles(prev => [...prev, newFile]);
        }
      } catch (error) {
        console.error("Upload Error:", error);
      }
    };

    reader.readAsText(file);
  }
  };

  const handleDeleteFile = async (filename: string, type?: string) => {
  try {
    const response = await fetch(`${baseUrl}/delete-document/${filename}`, {
      method: "DELETE"
    });

    if (response.ok) {
      type == "custom" ? 
      setCustomTexts(prev => prev.filter(f => f.title !== filename)) 
      : 
      setFiles(prev => prev.filter(f => f.name !== filename));
    }
  } catch (error) {
    console.error("Delete Error:", error);
  }
  };


  const handleAddCustomText = async () => {
    if (newTextTitle.trim() && newTextContent.trim()) {
      

      try {
        const id = uuidv4()
        const response = await fetch(`${baseUrl}/upload-files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: id,
            document: newTextContent,
            filename: newTextTitle,
            size: "0",
            type: "custom"
          }),
        });

        if (response.ok) {
          const newText: CustomText = {
            id: id,
            title: newTextTitle,
            content: newTextContent,
          }
          setCustomTexts((prevTexts) => [...prevTexts, newText])
        }
      } catch (error) {
        console.error("Upload Error:", error);
      }
      finally{
        setNewTextTitle("")
        setNewTextContent("")
        setIsAddingText(false)
      }
    }
  }

  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return <FileText className="w-6 h-6" />
    if (type === "text/csv") return <FileSpreadsheet className="w-6 h-6" />
    return <File className="w-6 h-6" />
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return size + " B"
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB"
    return (size / (1024 * 1024)).toFixed(2) + " MB"
  }


const getFiles = async () => {
    try {
      const response = await fetch(`${baseUrl}/get-files`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();

        const uploadedFiles: UploadedFile[] = [];
        const customTexts: CustomText[] = [];

        data.files.forEach((file: any) => {
        
        if (file.type === "custom") {
          const customTextData: CustomText = {
            id: file.id,
            title: file.name,
            content: "Hidden for security. Add the text again to see its content."
          };
          customTexts.push(customTextData); // Add to custom Text
        } else {
            const fileData: UploadedFile = {
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
          };
          uploadedFiles.push(fileData); // Add to normal files
        }
      });

      // Update states
      setFiles(uploadedFiles);
      setCustomTexts(customTexts);
        
      } else {
        console.error("Failed to fetch files:", response.status);
      }
    } catch (error) {
      console.error("Error getting all files:", error);
    }
  };

  useEffect(() => {
    try{
      getFiles()
    }
    catch (error){
      console.error("Error getting all files:", error);
    }
  }, [])



  return (
    <div className="w-full h-full pt-4 flex flex-col bg-zinc-200 dark:bg-neutral-900">
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-4">
          <h2 className="font-semibold text-lg text-black dark:text-white ">Uploaded Files</h2>
          
          <input id="fileInput" type="file" multiple className="hidden" onChange={handleFileUpload} />
          {files.map((file) => (
            <div
                key={file.id}
                className="bg-white text-zinc-800 dark:text-zinc-300 dark:bg-zinc-700/60 rounded-lg p-4 flex items-center justify-between"
            >
                <div className="flex items-center space-x-3">
                {getFileIcon(file.type)}
                <div className="flex-grow">
                    <h3 className="text-sm font-medium truncate">{file.name}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(file.size)}
                    </p>
                </div>
                </div>
                <Button
                variant="link"
                className="text-red-500  dark:hover:text-red-600"
                size="icon"
                onClick={() => handleDeleteFile(file.name)}
                >
                <Plus className="h-4 w-4 rotate-45" /> {/* Cross icon by rotating Plus */}
                </Button>
            </div>
            ))}
            <Button variant={"secondary"} className="w-full mb-4" onClick={() => document.getElementById("fileInput")?.click()}>
            <Plus className="mr-2 h-4 w-4" /> Add Files
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <h2 className="font-semibold text-lg text-black dark:text-white">Custom Knowledge</h2>
          {customTexts.map((text) => (
            <>
            <div
              key={text.id}
              className="bg-white text-zinc-800 dark:text-zinc-300  dark:bg-zinc-700/60 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-600 flex items-center justify-between"
              onClick={() => setSelectedText(text)}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6" />
                <div className="flex-grow">
                  <h3 className="text-sm font-medium truncate">{text.title}</h3>
                </div>
              </div>
              <Button
                variant="link"
                className="text-red-500  dark:hover:text-red-600 dark:hover:bg-inherit"
                size="icon"
                onClick={(e) => {e.stopPropagation(), handleDeleteFile(text.title,"custom")}}
                >
                <Plus className="h-4 w-4 rotate-45" /> {/* Cross icon by rotating Plus */}
                </Button>
            </div>
            
            </>
          ))}
          <Button variant={"secondary"} className="w-full" onClick={() => setIsAddingText(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Custom Text
          </Button>
        </div>
      </ScrollArea>
      <Dialog open={!!selectedText} onOpenChange={() => setSelectedText(null)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="text-zinc-800 dark:text-zinc-300">{selectedText?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <pre className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-300">{selectedText?.content}</pre>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddingText} onOpenChange={setIsAddingText}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-zinc-800 dark:text-zinc-300">Add Custom Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input className="text-zinc-800 dark:text-zinc-300" placeholder="Title" value={newTextTitle} onChange={(e) => setNewTextTitle(e.target.value)} />
            <Textarea
              placeholder="Content"
              className="text-zinc-800 dark:text-zinc-300"
              value={newTextContent}
              onChange={(e) => setNewTextContent(e.target.value)}
              rows={5}
            />
            <Button onClick={handleAddCustomText}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

