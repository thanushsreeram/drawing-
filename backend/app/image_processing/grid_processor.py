from typing import List, Optional, Tuple
from PIL import Image
from app.models.image import ExtractedCell, GridCellCoordinate, GridSplitConfig


class GridProcessingError(Exception):
    """Raised when grid splitting or extraction fails."""
    pass


class GridProcessor:
    """
    Architectural foundation for 3x3 step-by-step drawing grid processing
    and 9-cell extraction.
    """

    def __init__(self, config: Optional[GridSplitConfig] = None):
        self.config = config or GridSplitConfig()

    def calculate_cell_boxes(
        self, width: int, height: int
    ) -> List[Tuple[GridCellCoordinate, Tuple[int, int, int, int]]]:
        """
        Calculates bounding boxes (left, top, right, bottom) for each cell
        in the grid.
        """
        cell_width = width // self.config.cols
        cell_height = height // self.config.rows

        boxes: List[Tuple[GridCellCoordinate, Tuple[int, int, int, int]]] = []
        for r in range(self.config.rows):
            for c in range(self.config.cols):
                step_num = r * self.config.cols + c + 1
                coord = GridCellCoordinate(row=r, col=c, step_number=step_num)
                left = c * cell_width + self.config.padding_pixels
                top = r * cell_height + self.config.padding_pixels
                right = (
                    (c + 1) * cell_width - self.config.padding_pixels
                    if c < self.config.cols - 1
                    else width - self.config.padding_pixels
                )
                bottom = (
                    (r + 1) * cell_height - self.config.padding_pixels
                    if r < self.config.rows - 1
                    else height - self.config.padding_pixels
                )
                boxes.append((coord, (left, top, right, bottom)))
        return boxes

    def extract_cells_in_memory(
        self, image: Image.Image
    ) -> List[Tuple[GridCellCoordinate, Image.Image]]:
        """
        Extracts each of the individual cells as PIL Images in memory.
        """
        boxes = self.calculate_cell_boxes(image.width, image.height)
        results: List[Tuple[GridCellCoordinate, Image.Image]] = []
        for coord, box in boxes:
            cropped = image.crop(box)
            results.append((coord, cropped))
        return results
