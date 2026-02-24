from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from src.db.database import get_db
from src.models.order import Order, OrderItem
from src.models.product import Product
from src.models.user import User
from src.services.auth import get_current_user


router = APIRouter(prefix="/orders", tags=["orders"])


class OrderItemCreate(BaseModel):
    product_id: int


class OrderCreateRequest(BaseModel):
    items: List[OrderItemCreate]


class OrderItemResponse(BaseModel):
    product_id: int
    price_cents: int

    class Config:
        from_attributes = True


class OrderItemDetailResponse(BaseModel):
    product_id: int
    product_title: str
    price_cents: int


class OrderResponse(BaseModel):
    id: int
    status: str
    total_cents: int
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


class OrderDetailResponse(BaseModel):
    id: int
    status: str
    total_cents: int
    items: List[OrderItemDetailResponse]


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Order:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La commande doit contenir au moins un produit")

    product_ids = [item.product_id for item in payload.items]
    products = db.query(Product).filter(Product.id.in_(product_ids), Product.is_active.is_(True)).all()
    if len(products) != len(product_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un ou plusieurs produits sont invalides ou inactifs")

    # Map id -> product
    products_map = {p.id: p for p in products}

    order = Order(user_id=current_user.id, status="pending", total_cents=0)
    db.add(order)
    db.flush()  # pour avoir order.id

    total = 0
    for item in payload.items:
        product = products_map[item.product_id]
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            price_cents=product.price_cents,
        )
        total += product.price_cents
        db.add(order_item)

    order.total_cents = total
    db.commit()
    db.refresh(order)
    return order


def _order_to_detail(order: Order) -> OrderDetailResponse:
    return OrderDetailResponse(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        items=[
            OrderItemDetailResponse(
                product_id=item.product_id,
                product_title=item.product.title if item.product else "",
                price_cents=item.price_cents,
            )
            for item in order.items
        ],
    )


@router.get("/", response_model=List[OrderDetailResponse])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .all()
    )
    return [_order_to_detail(o) for o in orders]


@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable")
    return _order_to_detail(order)

