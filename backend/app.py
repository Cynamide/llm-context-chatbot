from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import dotenv
from typing import Dict
import uuid

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
    "http://localhost:5173/",
    os.environ.get("FRONTEND_URL")
    
    # Add other allowed origins as needed
]

app.add_middleware(
    CORSMiddleware,
    #allow_origins=origins,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Modify the document storage structure
document_registry: Dict[str, List[str]] = {}  # {filename: [chunk_ids]}


master_prompt = "You are a helpful AI agent that gives answer to user queries in the most direct and concise manner."
documents = []
documents.append(Document(page_content=master_prompt))
embeddings = OpenAIEmbeddings()
vector_store = FAISS.from_documents(documents, embeddings)
llm = ChatOpenAI(model="gpt-4", temperature=0)
qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=vector_store.as_retriever())


# Define request models
class KnowledgeBaseRequest(BaseModel):
    id: str
    document: str
    filename: str
    size: str
    type: str

class QueryRequest(BaseModel):
    query: str


@app.get("/get-files")
async def get_files():
    """
    Endpoint to retrieve a list of all uploaded files.
    """
    global document_registry, vector_store
    try:
        # Return filenames along with their metadata
        files = [
            {
                "id": metadata["doc_id"],
                "name": filename,
                "size": metadata["file_size"],
                "type": metadata["file_type"],
            }
            for filename, metadata in document_registry.items()
        ]
      
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving files: {str(e)}")


@app.post("/upload-files")
async def upload_files(request: KnowledgeBaseRequest):
    global vector_store, qa_chain, document_registry

    if not request.document or not request.filename:
        raise HTTPException(status_code=400, detail="Missing document or filename")

    try:
        # Check for existing filename
        if request.filename in document_registry:
            raise HTTPException(status_code=400, detail="Filename already exists")

        # Create document with filename in metadata
        if request.type != "custom":
            new_doc = Document(
                page_content= "contents of the document titled"+request.filename+"\n"+request.document,
                metadata={"doc_id":request.id, "filename": request.filename,"size":request.size, "type":request.type}
            )
        else:
            new_doc = Document(
                page_content= "contents of a custom knowledge titled: "+request.filename+"\n"+request.document,
                metadata={"doc_id":request.id, "filename": request.filename,"size":request.size, "type":request.type}
            )

        # Split and add to vector store
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents([new_doc])
        
        # Store chunk IDs
        chunk_ids = [str(uuid.uuid4()) for _ in chunks]
        document_registry[request.filename] = {
            "chunk_ids": chunk_ids,
            "doc_id": request.id,
            "file_size": request.size,
            "file_type": request.type,
        }
        
        # Add with custom IDs
        vector_store.add_documents(chunks, ids=chunk_ids)

        # Update QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(model="gpt-4", temperature=0),
            retriever=vector_store.as_retriever()
        )

        return {"message": "File uploaded successfully", "filename": request.filename}

    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    

@app.delete("/delete-document/{filename}")
async def delete_document(filename: str):
    global vector_store, qa_chain, document_registry

    if not vector_store:
        raise HTTPException(status_code=404, detail="Knowledge base is empty")

    if filename not in document_registry:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Delete all chunks for this file
        chunk_ids = document_registry[filename]["chunk_ids"]
        vector_store.delete(chunk_ids)
        
        # Remove from registry
        del document_registry[filename]

        # Update QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(model="gpt-4", temperature=0),
            retriever=vector_store.as_retriever()
        )

        return {"message": "File deleted successfully"}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query_knowledge_base(request: QueryRequest):
    """
    Endpoint to query the knowledge base.
    """
    global qa_chain
    if qa_chain is None:
        return {"query": request.query, "answer": "Knowledge base is not initialized. please try again later"}, 400
        
    try:
        # Generate an answer using the QA chain
        response = qa_chain.invoke(request.query)
        return {"query": request.query, "answer": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")
