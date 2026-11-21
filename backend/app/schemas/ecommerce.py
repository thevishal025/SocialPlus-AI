from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class EcommerceAnalyzeRequest(BaseModel):
    url: str = Field(..., description="E-Commerce product URL (Flipkart, Amazon, or supported e-commerce site)")
    max_reviews: int = Field(default=50, ge=1, le=10000, description="Maximum customer reviews to retrieve via pagination")

class EcommerceManualReviewItem(BaseModel):
    text: str
    rating: Optional[int] = 5
    username: Optional[str] = "Customer"
    date: Optional[str] = None
    title: Optional[str] = None

class EcommerceManualAnalyzeRequest(BaseModel):
    title: Optional[str] = "Imported Product Dataset"
    brand: Optional[str] = "Verified Brand"
    price: Optional[str] = None
    reviews: List[EcommerceManualReviewItem] = Field(..., min_length=1)

class EcommerceProductSchema(BaseModel):
    platform: str = "ecommerce"
    url: str
    title: str
    brand: Optional[str] = "Unknown Brand"
    image: Optional[str] = None
    price: Optional[str] = None
    description: Optional[str] = None
    average_rating: Optional[float] = None
    rating_count: Optional[int] = None
    review_count: Optional[int] = None
    specifications: Optional[Dict[str, str]] = None

class EcommerceAuditSchema(BaseModel):
    reported_reviews: int = 0
    reported_ratings: int = 0
    reported_average_rating: float = 0.0
    retrieved_reviews: int = 0
    unique_reviews: int = 0
    analyzed_reviews: int = 0

class TopComplaintItem(BaseModel):
    name: str
    mentions: int
    percentage: float
    excerpts: List[str]

class ProductAspectItem(BaseModel):
    aspect: str
    sentiment: str
    mentions: int
    percentage: float
    excerpts: List[str]

class EcommerceResponseSchema(BaseModel):
    success: bool = True
    reviews_blocked: bool = False
    message: Optional[str] = None
    product: EcommerceProductSchema
    audit: EcommerceAuditSchema
    comments: List[Dict[str, Any]]
    summary: Dict[str, Any]
    top_complaints: List[TopComplaintItem] = []
    product_strengths: List[ProductAspectItem] = []
    product_weaknesses: List[ProductAspectItem] = []
    verified_average_rating: Optional[float] = None

