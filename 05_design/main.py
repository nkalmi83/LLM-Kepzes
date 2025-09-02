from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import ProductDTO, ShoppingCartItemDTO, create_tables, get_db


class ProductDTOCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    stock: int


class ProductDTOResponse(BaseModel):
    id: int
    name: str
    price: float
    description: Optional[str] = None
    stock: int

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    created_at: datetime
    product: ProductDTOResponse

    class Config:
        from_attributes = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Get the directory where this main.py file is located
BASE_DIR = Path(__file__).parent

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})



@app.post("/products/", response_model=ProductDTOResponse)
async def create_product(product: ProductDTOCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductDTO).filter(ProductDTO.name == product.name))
    db_product = result.first()

    if db_product:
        raise HTTPException(status_code=400, detail="Product name already exists")

    db_product = ProductDTO(name=product.name, price=product.price, description=product.description, stock=product.stock)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product


@app.get("/products/", response_model=List[ProductDTOResponse])
async def get_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductDTO))
    products = result.scalars().all()
    return products


@app.get("/products/{product_id}", response_model=ProductDTOResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductDTO).where(ProductDTO.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.put("/products/{product_id}", response_model=ProductDTOResponse)
async def update_product(product_id: int, updated: ProductDTOCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductDTO).where(ProductDTO.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in updated.dict().items():
        setattr(product, key, value)
    await db.commit()
    await db.refresh(product)
    return product

@app.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductDTO).where(ProductDTO.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    return {"detail": "Product deleted"}


# Shopping Cart endpoints
@app.post("/cart/items/", response_model=CartItemResponse)
async def add_to_cart(cart_item: CartItemCreate, db: AsyncSession = Depends(get_db)):
    # Check if product exists
    result = await db.execute(select(ProductDTO).where(ProductDTO.id == cart_item.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if item already exists in cart
    result = await db.execute(select(ShoppingCartItemDTO).where(ShoppingCartItemDTO.product_id == cart_item.product_id))
    existing_item = result.scalar_one_or_none()
    
    if existing_item:
        # Update quantity if item already in cart
        existing_item.quantity += cart_item.quantity
        await db.commit()
        await db.refresh(existing_item)
        # Load the product relationship
        await db.refresh(existing_item, ["product"])
        return existing_item
    else:
        # Create new cart item
        db_cart_item = ShoppingCartItemDTO(
            product_id=cart_item.product_id,
            quantity=cart_item.quantity
        )
        db.add(db_cart_item)
        await db.commit()
        await db.refresh(db_cart_item)
        # Load the product relationship
        await db.refresh(db_cart_item, ["product"])
        return db_cart_item


@app.get("/cart/items/", response_model=List[CartItemResponse])
async def get_cart_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ShoppingCartItemDTO).join(ProductDTO).order_by(ShoppingCartItemDTO.created_at.desc())
    )
    cart_items = result.scalars().all()
    # Ensure product relationships are loaded
    for item in cart_items:
        await db.refresh(item, ["product"])
    return cart_items


@app.delete("/cart/items/{item_id}")
async def remove_from_cart(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShoppingCartItemDTO).where(ShoppingCartItemDTO.id == item_id))
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    await db.delete(cart_item)
    await db.commit()
    return {"detail": "Item removed from cart"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
