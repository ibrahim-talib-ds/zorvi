"""ZORVI — Admin platform settings schemas."""
from pydantic import BaseModel


class SettingItem(BaseModel):
    key: str
    value: str
    description: str | None = None


class SettingsRead(BaseModel):
    settings: list[SettingItem]


class SettingsUpdate(BaseModel):
    settings: dict[str, str]
