from pathlib import Path
from typing import List
from PIL import Image
from app.models.image import ExtractedCell, GridCellCoordinate


class SheetExporter:
    """
    Architectural foundation for saving, organizing, and exporting
    lesson sheets, paginated steps, and cropped drawing cells.
    """

    def __init__(self, storage_root: Path):
        self.storage_root = storage_root
        self.sheets_dir = storage_root / "sheets"
        self.steps_dir = storage_root / "steps"
        self.lessons_dir = storage_root / "lessons"

    def ensure_directories(self) -> None:
        """Ensures all target export storage directories exist."""
        for directory in [self.sheets_dir, self.steps_dir, self.lessons_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    def export_step_cell(
        self,
        cell_image: Image.Image,
        lesson_id: str,
        step_number: int,
        image_format: str = "PNG",
    ) -> Path:
        """
        Exports an individual step image to storage/steps/<lesson_id>_step_<n>.<ext>
        """
        self.ensure_directories()
        file_path = self.steps_dir / f"{lesson_id}_step_{step_number}.{image_format.lower()}"
        cell_image.save(file_path, format=image_format)
        return file_path
