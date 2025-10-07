import { ChatInterface } from "@/components/chat-interface"
import { KnowledgeDrawer } from "@/components/knowledge-drawer"

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <KnowledgeDrawer />
      <main className="flex-1 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  )
}
