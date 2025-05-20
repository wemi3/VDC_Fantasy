from fastapi import FastAPI
from routes import fantasy
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Register routes
app.include_router(fantasy.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vdc-fantasy.vercel.app",
        "http://localhost:5173",  # if using local frontend dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=10000, reload=True)
