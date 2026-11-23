import unittest
from PIL import Image
from app.api.routes.health import get_health
from app.image_processing.grid_processor import GridProcessor
from app.image_processing.resizer import resize_maintaining_aspect_ratio
from app.models.image import GridSplitConfig


class TestInitialization(unittest.TestCase):
    def test_health_endpoint_logic(self):
        """Test GET /api/health route handler returns status ok and app SketchFlow AI"""
        response = get_health()
        self.assertEqual(response.status, "ok")
        self.assertEqual(response.app, "SketchFlow AI")

    def test_grid_processor_3x3_boxes(self):
        """Test that 3x3 grid processor computes exactly 9 boxes covering the image"""
        processor = GridProcessor(GridSplitConfig(rows=3, cols=3))
        boxes = processor.calculate_cell_boxes(width=900, height=900)
        self.assertEqual(len(boxes), 9)

        # Check first step (0, 0)
        coord, box = boxes[0]
        self.assertEqual(coord.step_number, 1)
        self.assertEqual(coord.row, 0)
        self.assertEqual(coord.col, 0)
        self.assertEqual(box, (0, 0, 300, 300))

        # Check last step (2, 2)
        coord_last, box_last = boxes[8]
        self.assertEqual(coord_last.step_number, 9)
        self.assertEqual(coord_last.row, 2)
        self.assertEqual(coord_last.col, 2)
        self.assertEqual(box_last, (600, 600, 900, 900))

    def test_image_resizer_preserves_aspect_ratio(self):
        """Test aspect-ratio preserving thumbnail resizer"""
        test_img = Image.new("RGB", (1200, 600), color=(255, 0, 0))
        resized = resize_maintaining_aspect_ratio(test_img, (600, 600))
        # 1200x600 scaled to fit 600x600 bounding box should be 600x300
        self.assertEqual(resized.size, (600, 300))


if __name__ == "__main__":
    unittest.main()
