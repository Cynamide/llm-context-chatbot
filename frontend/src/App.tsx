import { useState, useRef, useEffect } from "react";
import { ModeToggle } from "@/components/mode-toggle";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, Bot, User, Menu } from 'lucide-react'
import { Sidebar } from "./components/Sidebar";

import {v4 as uuidv4} from 'uuid';
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet";




type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
};

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const baseUrl = import.meta.env.VITE_BACKEND_URL;


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: 'user',
    }

    setIsLoading(true)

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
      setInput(""); // Clear input after sending
      setIsLoading(false)
    }
  };


  

  return (
    <>
    <div className="flex flex-col md:flex-row h-screen bg-zinc-100 dark:bg-zinc-950">
      <div className="hidden md:block w-full md:w-1/4 border-r border-zinc-300 dark:border-zinc-700">
        <Sidebar />
      </div>
      <div className="flex flex-col w-full md:w-3/4">
        <Card className="flex flex-col flex-grow m-0 rounded-none bg-background">
          <CardHeader className="border-b flex justify-between items-center border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden mr-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-4/5 sm:w-[300px]">
                  <Sidebar />
                </SheetContent>
              </Sheet>
              
              <CardTitle className="pr-4">Context Chatbot</CardTitle>
              <ModeToggle />
            </div>
          </CardHeader>
          <CardContent className="flex-grow p-0 bg-gray-100 dark:bg-zinc-950 ">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="flex items-start gap-2 max-w-[80%]">
                      <Avatar className={m.role === "user" ? "order-2" : ""}>
                        <AvatarFallback>{m.role === "user" ? <User /> : <Bot />}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 ${
                          m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
          <CardFooter className="border-t p-4 border-zinc-300 dark:border-zinc-700">
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-grow border-zinc-300 dark:border-zinc-700"
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                <ArrowUp className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
    </>
  );
}

export default App;
