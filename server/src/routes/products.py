from typing import List
import os
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.models.product import Product
from src.services.auth import require_admin


router = APIRouter(prefix="/products", tags=["products"])


class ProductBase(BaseModel):
    title: str
    description: str | None = None
    price_cents: int
    cover_image_url: str | None = None
    file_key: str


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price_cents: int | None = None
    cover_image_url: str | None = None
    file_key: str | None = None
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)) -> list[Product]:
    products = db.query(Product).filter(Product.is_active.is_(True)).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    product = db.query(Product).filter(Product.id == product_id, Product.is_active.is_(True)).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable")
    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> Product:
    product = Product(**payload.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> None:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable")

    db.delete(product)
    db.commit()
    return None


def _slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return re.sub(r"-{2,}", "-", value)


@router.post("/{product_id}/cover", response_model=ProductResponse)
async def upload_cover(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable")

    # Vérification basique du type de fichier
    allowed = {"image/png", "image/jpeg", "image/svg+xml", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format d'image non supporté")

    covers_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "media", "covers")
    os.makedirs(covers_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower() or ".png"
    name = f"{_slugify(product.title)}-{uuid.uuid4().hex[:8]}{ext}"
    disk_path = os.path.join(covers_dir, name)

    contents = await file.read()
    with open(disk_path, "wb") as f:
        f.write(contents)

    product.cover_image_url = f"/static/covers/{name}"
    db.commit()
    db.refresh(product)
    return product

