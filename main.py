
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import products, users, forecasting


app = FastAPI(
    title="SmartStock API",
    version="1.0.0",
    description="Backend API for SmartStock Inventory Forecasting System"
)

# Allow CORS for all origins (adjust as needed for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(users.router)
app.include_router(forecasting.router)

@app.get("/")
def root():
    return {"message": "SmartStock API is running"}
