from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.models.order import Order, OrderItem
from src.models.product import Product
from src.models.user import User
from src.services.auth import get_current_user


router = APIRouter(prefix="/downloads", tags=["downloads"])


class DownloadLinkResponse(BaseModel):
    product_id: int
    url: str


@router.get("/{product_id}", response_model=DownloadLinkResponse)
def get_download_link(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DownloadLinkResponse:
    # Vérifie que l'utilisateur a au moins une commande payée contenant ce produit
    has_paid_order = (
        db.query(Order)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .filter(
            Order.user_id == current_user.id,
            Order.status == "paid",
            OrderItem.product_id == product_id,
        )
        .first()
        is not None
    )
    if not has_paid_order:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas acheté ce produit",
        )

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable")

    # Ici on renvoie une URL vers le fichier statique servi par FastAPI.
    # Exemple: /static/ebooks/decrochez-votre-alternance.pdf
    download_url = f"/static/{product.file_key}"
    return DownloadLinkResponse(product_id=product.id, url=download_url)

