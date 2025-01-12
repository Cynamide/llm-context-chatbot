import React, { useState } from "react";

function App() {
  const [messages, setMessages] = useState([]); // Chat messages
  const [input, setInput] = useState(""); // User input
  const [knowledgeBase, setKnowledgeBase] = useState(""); // Knowledge base documents
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [response, setResponse] = useState(""); // Last prompt and response

  const baseUrl = import.meta.env.BACKEND_URL;
  const url = `${baseUrl}/create-knowledge-base`;

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const response = await fetch(`${baseUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input }),
    });

    const data = await response.json();
    console.log(data);
    setMessages([
      ...messages,
      { text: data.answer.query, type: "user" },
      { text: data.answer.result, type: "gpt" },
    ]);
    setResponse(data.answer.query); // Set last prompt and response
    setInput(""); // Clear input after sending
  };

  // Handle adding documents to the knowledge base
  const handleAddToKnowledgeBase = async () => {
    const response = await fetch(`${baseUrl}/create-knowledge-base`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ knowledge: knowledgeBase }),
    });

    if (response.ok) {
      setKnowledgeBase([]); // Clear knowledge base after adding
      setIsModalOpen(false); // Close modal
    }
  };

  return (
    <>
      <h1 className="font-bold w-full p-6 text-center text-3xl">
        Crustdata Chatbot
      </h1>

      <div className="flex flex-col items-center">
        {messages.length > 1 && (
          <div className="bg-gray-700 p-4 w-full max-w-md rounded-lg shadow-md">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 ${
                  msg.type === "user" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className={`inline-block p-2 rounded-lg ${
                    msg.type === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex mt-4 space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 w-full"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 text-white rounded-lg px-4 py-2"
          >
            Send
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 bg-green-700 text-white rounded-lg px-4 py-2"
        >
          Open Knowledge Base
        </button>
      </div>

      {/* Modal for Knowledge Base */}
      {isModalOpen && (
        <div className=" fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-800 p-5 rounded-lg shadow-lg w-2/3">
            <h2 className="text-xl pb-4 font-bold">Knowledge Base</h2>
            <textarea
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="Add text to knowledge base..."
              className="border border-gray-300 rounded-lg w-full h-32 p-2"
            ></textarea>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddToKnowledgeBase}
                className="bg-blue-500 text-white rounded-lg px-4 py-2"
              >
                Add to Knowledge Base
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="ml-2 bg-red-500 text-white rounded-lg px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
