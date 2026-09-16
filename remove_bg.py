import sys
import os
from PIL import Image

def remove_background(input_path, output_path):
    try:
        from rembg import remove, new_session
        session = new_session("u2netp")
        input_image = Image.open(input_path)
        output_image = remove(input_image, session=session)
        output_image.save(output_path, "PNG")
        print(f"Successfully removed background: {output_path}")
    except Exception as e:
        print(f"Error removing background: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input_image> <output_image>")
        sys.exit(1)
    remove_background(sys.argv[1], sys.argv[2])
