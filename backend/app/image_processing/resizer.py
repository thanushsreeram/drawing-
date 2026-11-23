from typing import Tuple
from PIL import Image


def resize_maintaining_aspect_ratio(
    image: Image.Image,
    target_bounding_box: Tuple[int, int],
    resample: Image.Resampling = Image.Resampling.LANCZOS,
) -> Image.Image:
    """
    Resize image to fit within target (max_width, max_height) while
    strictly preserving the original aspect ratio.
    """
    copy_img = image.copy()
    copy_img.thumbnail(target_bounding_box, resample=resample)
    return copy_img


def resize_exact_canvas(
    image: Image.Image,
    target_size: Tuple[int, int],
    background_color: Tuple[int, int, int] = (255, 255, 255),
    resample: Image.Resampling = Image.Resampling.LANCZOS,
) -> Image.Image:
    """
    Fits image within exact target dimensions on a padded canvas (default white).
    """
    fitted = resize_maintaining_aspect_ratio(image, target_size, resample=resample)
    new_canvas = Image.new("RGB", target_size, background_color)
    paste_x = (target_size[0] - fitted.width) // 2
    paste_y = (target_size[1] - fitted.height) // 2
    new_canvas.paste(fitted, (paste_x, paste_y))
    return new_canvas
