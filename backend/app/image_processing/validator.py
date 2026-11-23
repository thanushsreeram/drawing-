from pathlib import Path
from PIL import Image, UnidentifiedImageError
from app.models.image import ImageMetadata

# Supported user upload formats
SUPPORTED_FORMATS = {"PNG", "JPEG", "JPG", "WEBP"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB max file size limit
MIN_IMAGE_DIMENSION = 300  # Minimum 300x300 for grid quality


class ImageValidationError(Exception):
    """Raised when an uploaded image fails validation checks."""
    pass


def validate_image_file(file_path: Path) -> ImageMetadata:
    """
    Validates an uploaded image file's existence, size, header integrity,
    and format.
    """
    if not file_path.exists():
        raise ImageValidationError(f"File not found: {file_path}")

    size_bytes = file_path.stat().st_size
    if size_bytes == 0:
        raise ImageValidationError("Uploaded image file is empty.")

    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise ImageValidationError(
            f"File size {size_bytes / (1024 * 1024):.2f}MB exceeds limit of {MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB"
        )

    try:
        # Initial verification pass to ensure image is not corrupted
        with Image.open(file_path) as img:
            img.verify()
            detected_format = (img.format or "").upper()
            if detected_format not in SUPPORTED_FORMATS:
                raise ImageValidationError(
                    f"Unsupported image format: '{detected_format}'. Allowed: {', '.join(sorted(SUPPORTED_FORMATS))}"
                )

        # Reopen to read dimensions and mode (verify() invalidates file pointer in Pillow)
        with Image.open(file_path) as reloaded_img:
            width, height = reloaded_img.size
            if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
                raise ImageValidationError(
                    f"Image resolution {width}x{height} is too small. Minimum required is {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION}."
                )

            return ImageMetadata(
                filename=file_path.name,
                format=detected_format,
                width=width,
                height=height,
                mode=reloaded_img.mode,
                size_bytes=size_bytes,
            )
    except UnidentifiedImageError as exc:
        raise ImageValidationError(f"Invalid or corrupted image format: {exc}") from exc
