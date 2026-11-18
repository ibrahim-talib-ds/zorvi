from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.translation.service import translate_many

router = APIRouter(prefix="/api/v1/translate", tags=["translation"])
SUPPORTED_LANGS = {"en", "sw", "fr", "ru", "ar", "es", "de", "pt", "zh", "hi"}

class TranslateIn(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=200)
    target: str = Field(min_length=2, max_length=10)

class TranslateOut(BaseModel):
    translations: list[str]

@router.post("", response_model=TranslateOut)
async def translate(body: TranslateIn):
    if body.target not in SUPPORTED_LANGS:
        raise HTTPException(status_code=400, detail="Unsupported language")
    translations = await translate_many(body.texts, body.target)
    return {"translations": translations}
