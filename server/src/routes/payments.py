import os

import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.models.order import Order
from src.models.user import User
from src.services.auth import get_current_user


load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PAYMENTS_MOCK_ENABLED = os.getenv("PAYMENTS_MOCK_ENABLED", "1")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


router = APIRouter(prefix="/payments", tags=["payments"])


class CreatePaymentIntentRequest(BaseModel):
    order_id: int


class CreatePaymentIntentResponse(BaseModel):
    client_secret: str


@router.post("/create-intent", response_model=CreatePaymentIntentResponse)
def create_payment_intent(
    payload: CreatePaymentIntentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreatePaymentIntentResponse:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Stripe n'est pas configuré")

    order = db.query(Order).filter(Order.id == payload.order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable")
    if order.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La commande n'est pas en attente de paiement")

    if order.stripe_payment_intent_id:
        # Réutilise un PaymentIntent existant
        payment_intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
    else:
        payment_intent = stripe.PaymentIntent.create(
            amount=order.total_cents,
            currency="eur",
            metadata={"order_id": str(order.id), "user_id": str(current_user.id)},
        )
        order.stripe_payment_intent_id = payment_intent.id
        db.commit()

    return CreatePaymentIntentResponse(client_secret=payment_intent.client_secret)  # type: ignore[arg-type]


class MockConfirmRequest(BaseModel):
    order_id: int


@router.post("/mock-confirm")
def mock_confirm_payment(
    payload: MockConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if PAYMENTS_MOCK_ENABLED != "1":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirmation de paiement simulée désactivée",
        )
    order = db.query(Order).filter(Order.id == payload.order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable")
    order.status = "paid"
    db.commit()
    return {"status": "ok"}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="stripe-signature"),
):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook Stripe non configuré")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signature Stripe invalide")

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent["id"]

        order = db.query(Order).filter(Order.stripe_payment_intent_id == payment_intent_id).first()
        if order:
            order.status = "paid"
            db.commit()

    return {"received": True}

