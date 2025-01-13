from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import dotenv

dotenv.load_dotenv()  # Load environment variables from .env file


from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain.schema import Document

import os

# Initialize FastAPI app
app = FastAPI()


origins = [
    "https://llm-chatbot.netlify.app",  # Adjust according to your frontend's URL
    "https://llm-chatbot.netlify.app:5173",
    os.environ.get("FRONTEND_URL")
    
    # Add other allowed origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)



# Global variables for the vector store and QA chain
vector_store = None
qa_chain = None

# Define request models
class KnowledgeBaseRequest(BaseModel):
    knowledge: str

class QueryRequest(BaseModel):
    query: str

@app.post("/create-knowledge-base")
async def create_knowledge_base(request:KnowledgeBaseRequest):
    """
    Endpoint to create a knowledge base from provided knowledge.
    """
    global vector_store, qa_chain

    if not request.knowledge:
        raise HTTPException(status_code=400, detail="No knowledge provided.")

    try:
        # Step 1: Load documents from the provided knowledge
        print(request.knowledge)
        documents = []
        documents.append(Document(page_content=request.knowledge))
        
        

        # Step 2: Split documents into smaller chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        docs = text_splitter.split_documents(documents)

        # Step 3: Embed documents into a vector store using OpenAI embeddings
        embeddings = OpenAIEmbeddings()
        vector_store = FAISS.from_documents(docs, embeddings)

        # Step 4: Initialize RetrievalQA chain with GPT-4 and the vector store retriever
        llm = ChatOpenAI(model="gpt-4", temperature=0)
        qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=vector_store.as_retriever())

        return {"message": "Knowledge base created successfully."}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error creating knowledge base: {str(e)}")

@app.post("/query")
async def query_knowledge_base(request: QueryRequest):
    """
    Endpoint to query the knowledge base.
    """
    global qa_chain

    if qa_chain is None:
        raise HTTPException(status_code=400, detail="Knowledge base is not initialized.")

    try:
        # Generate an answer using the QA chain
        response = qa_chain.invoke(request.query)
        return {"query": request.query, "answer": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")
