from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, StringConstraints

Kind = Literal["income", "expense"]

# Keys the frontend maps to its palette and to Lucide icons. Keep both lists in sync
# with frontend/src/categories/appearance.ts.
CategoryColor = Literal[
    "plum", "rose", "pink", "red", "orange", "amber", "green",
    "teal", "cyan", "sky", "blue", "indigo", "slate", "stone",
]  # fmt: skip
CategoryIcon = Literal[
    "shopping-basket", "utensils", "house", "receipt", "car", "bus", "shopping-bag",
    "heart-pulse", "baby", "smartphone", "shield-check", "plane", "gift", "ellipsis",
    "briefcase", "store", "coins", "undo", "coffee", "shirt", "dumbbell", "graduation-cap",
    "paw-print", "fuel", "wifi", "zap", "droplet", "sparkles", "book-open", "piggy-bank",
    "landmark", "wrench",
]  # fmt: skip

CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]


class CategoryCreate(BaseModel):
    kind: Kind
    name: CategoryName
    color: CategoryColor
    icon: CategoryIcon


class CategoryUpdate(BaseModel):
    name: CategoryName | None = None
    color: CategoryColor | None = None
    icon: CategoryIcon | None = None


class Category(BaseModel):
    id: UUID
    kind: Kind
    name: str
    color: str
    icon: str
    archived: bool
    created_at: datetime


class CategoryDeleted(BaseModel):
    """`archived` when the category is still referenced, so its history keeps the name."""

    result: Literal["deleted", "archived"]
