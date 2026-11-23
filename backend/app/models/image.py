from typing import Optional
from pydantic import BaseModel, Field


class ImageMetadata(BaseModel):
    filename: str
    format: str
    width: int
    height: int
    mode: str
    size_bytes: int


class GridCellCoordinate(BaseModel):
    row: int = Field(ge=0, le=2, description="Row index (0 to 2)")
    col: int = Field(ge=0, le=2, description="Column index (0 to 2)")
    step_number: int = Field(ge=1, le=9, description="1-indexed step number (1 to 9)")


class GridSplitConfig(BaseModel):
    rows: int = Field(default=3, ge=1, le=5, description="Number of rows in lesson grid")
    cols: int = Field(default=3, ge=1, le=5, description="Number of columns in lesson grid")
    padding_pixels: int = Field(default=0, ge=0, description="Margin/padding around cells in pixels")
    maintain_aspect_ratio: bool = True


class ExtractedCell(BaseModel):
    coordinate: GridCellCoordinate
    width: int
    height: int
    output_path: Optional[str] = None
