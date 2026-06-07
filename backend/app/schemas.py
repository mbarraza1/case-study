"""Pydantic request/response models for the API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)


class CartAddRequest(BaseModel):
    partNumber: str
    quantity: int = 1


class CartRemoveRequest(BaseModel):
    partNumber: str
