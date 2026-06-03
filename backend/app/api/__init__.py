
from app.api.concerts import router as concerts_router
from app.api.payments import router as payments_router
from app.api.requests import router as requests_router
from app.api.seats import router as seats_router
from app.api.tickets import router as tickets_router

__all__ = [
    "concerts_router",
    "seats_router",
    "payments_router",
    "requests_router",
    "tickets_router",
]
