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

stored_files = set()  # Set to track stored files

# Define request models
class KnowledgeBaseRequest(BaseModel):
    knowledge: str

class QueryRequest(BaseModel):
    query: str

@app.post("/upload-file")
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
        prompt = """Sample questions and answers
                    Q: “How do I search for people given their current title, current company and location?”
                    Sample answer: 
                    You can use api.crustdata.com/screener/person/search endpoint. Here is an example curl request to find “people with title engineer at OpenAI in San Francisco”
                    curl --location 'https://api.crustdata.com/screener/person/search' \
                    --header 'Content-Type: application/json' \
                    --header 'Authorization: Token $token \
                    --data '{
                        "filters": [
                            {
                                "filter_type": "CURRENT_COMPANY",
                                "type": "in",
                                "value": [
                                    "openai.com"
                                ]
                            },
                            {
                                "filter_type": "CURRENT_TITLE",
                                "type": "in",
                                "value": [
                                    "engineer"
                                ]
                            },
                            {    "filter_type": "REGION",
                                "type": "in",
                                "value": [
                                    "San Francisco, California, United States"
                                ]
                            }        
                        ],
                        "page": 1
                    }'

                    Q: I tried using the screener/person/search API to compare against previous values this weekend. I am blocked on the filter values. It seems like there's a strict set of values for something like a region. Because of that if I pass in something that doesn't fully conform to the list of enums you support for that filter value, the API call fails. The location fields for us are not normalized so I can't make the calls.
                    I tried search/enrichment by email but for many entities we have @gmails rather than business emails. Results are not the best.


                    Is there a standard you're using for the region values? I get this wall of text back when I don't submit a proper region value but it's hard for me to know at a glance how I should format my input
                    {
                    "non_field_errors": [
                        "No mapping found for REGION: San Francisco. Correct values are ['Aruba', 'Afghanistan', 'Angola', 'Anguilla', 'Åland Islands', 'Albania', 'Andorra', 'United States', 'United Kingdom', 'United Arab Emirates', 'United States Minor Outlying Islands', 'Argentina', 'Armenia', 'American Samoa', 'US Virgin Islands', 'Antarctica', 'French Polynesia', 'French Guiana', 'French Southern and Antarctic Lands', 'Antigua and Barbuda', 'Australia', 'Austria', 'Azerbaijan', 'Burundi', 'Belgium', 'Benin', 'Burkina Faso', 'Bangladesh', 'Bulgaria', 'Bahrain', 'The Bahamas', 'Bosnia and Herzegovina', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Saint Kitts and Nevis', 'Saint Helena, Ascension and Tristan da
                    …
                            

                    Sample answer
                    Yes there is specific list of regions listed here https://crustdata-docs-region-json.s3.us-east-2.amazonaws.com/updated_regions.json .
                    """
        response = qa_chain.invoke(request.query)
        return {"query": request.query, "answer": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")
