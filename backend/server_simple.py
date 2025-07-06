from fastapi import FastAPI

# Create the main app
app = FastAPI()

@app.get("/api/test")
async def test_endpoint():
    return {"message": "API is working!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)