import { useState, useRef, useEffect } from "react";
import { ModeToggle } from "@/components/mode-toggle";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, Bot, User, Upload, Database, File } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import {v4 as uuidv4} from 'uuid';




type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
};

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [files, setFiles] = useState<FileList | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [knowledgeBaseEntry, setKnowledgeBaseEntry] = useState('')
  const [isKnowledgeBaseDialogOpen, setIsKnowledgeBaseDialogOpen] = useState(false)
  const [isChatStarted, setIsChatStarted] = useState(false)

  const baseUrl = import.meta.env.VITE_BACKEND_URL;

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: 'user',
    }

    setIsLoading(true)
    setInput(""); // Clear input after sending


    try{
      const response = await fetch(`${baseUrl}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);

        const assistantMessage: Message = {
        id: uuidv4(),
        content: data.answer.result,
        role: 'assistant',
      };
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      }
      else{
        const assistantMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I couldn't process your request. Please try again later. HTTP Error: "+response.status,
        role: 'assistant',
      };
      setMessages(prev => [...prev, userMessage, assistantMessage]);
    }
    }
    catch (error) {
      console.log(error);
      const assistantMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I couldn't process your request. Please try again later.",
        role: 'assistant',
      };
      setMessages(prev => [...prev, userMessage, assistantMessage]);
    }
    finally{
      setIsLoading(false)
    }
  };

  // Handle adding documents to the knowledge base
  const handleAddToKnowledgeBase = async () => {
    const response = await fetch(`${baseUrl}/upload-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: files }),
    });

    if (response.ok) {
      setIsKnowledgeBaseDialogOpen(false)
    }
    
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  useEffect(() => {
    console.log(files)
  }
  , [files])


  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length > 0 && !isChatStarted) {
      setIsChatStarted(true)
    }
  }, [messages])

  return (
    <>
    
    <div className={`flex flex-col h-screen bg-gray-100 dark:bg-gray-900 ${isChatStarted ? '' : 'justify-center'}`}>
      <Card className={`flex flex-col m-0 rounded-none bg-background ${isChatStarted ? 'h-full' : 'mx-auto w-full max-w-md'}`}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-center">Context Chatbot</CardTitle>
            <ModeToggle />
          </div>
        </CardHeader>
        {isChatStarted && (
          <CardContent className="flex-grow p-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 p-4">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[80%]  ${isMobile ? 'max-w-full' : ''}`}>
                      <Avatar className={`m-1 ${m.role === 'user' ? 'order-2' : ''}`}>
                        <AvatarFallback>{m.role === 'user' ? <User /> : <Bot />}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 ${
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        )}
        <CardFooter className={`border-t p-4 ${isChatStarted ? '' : 'border-t-0'}`}>
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-4">
            <input
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              multiple
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon" variant="outline">
                  <Upload className="h-4 w-4" />
                  <span className="sr-only">Upload options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                  <File className="mr-2 h-4 w-4" />
                  <span>Upload file</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsKnowledgeBaseDialogOpen(true)}>
                  <Database className="mr-2 h-4 w-4" />
                  <span>Add to Knowledge Base</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isKnowledgeBaseDialogOpen} onOpenChange={setIsKnowledgeBaseDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-black dark:text-white">Add to Knowledge Base</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col space-y-4">
                  <Input
                    className="text-black dark:text-white"
                    value={knowledgeBaseEntry}
                    onChange={(e) => setKnowledgeBaseEntry(e.target.value)}
                    placeholder="Enter knowledge base entry..."
                  />
                  <Button onClick={handleAddToKnowledgeBase}>Add Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}

export default App;
