import os
import sys

try:
    from PIL import Image
    import imagehash
except ImportError:
    print("Required libraries are missing. Please install them using:")
    print("pip install Pillow imagehash")
    sys.exit(1)


def generate_all_hashes(image_path):
    """
    Takes an image path and computes various perceptual hashes.
    """
    if not os.path.exists(image_path):
        print(f"Error: The file '{image_path}' does not exist.")
        return
    
    try:
        # Open the image using Pillow
        with Image.open(image_path) as img:
            print(f"--- Perceptual Hashes for '{os.path.basename(image_path)}' ---")
            
            # Average Hash (aHash)
            # Fast but not very robust against scaling or aspect ratio changes.
            ahash = imagehash.average_hash(img)
            print(f"Average Hash (aHash):  {ahash}")
            
            # Perception Hash (pHash)
            # Uses DCT (Discrete Cosine Transform). More robust than aHash.
            phash = imagehash.phash(img)
            print(f"Perception Hash (pHash): {phash}")
            
            # Perception Hash (Simple pHash)
            # A simpler version of pHash.
            phash_simple = imagehash.phash_simple(img)
            print(f"Simple pHash:          {phash_simple}")

            # Difference Hash (dHash)
            # Tracks gradients. Very robust and fast.
            dhash = imagehash.dhash(img)
            print(f"Difference Hash (dHash): {dhash}")
            
            # Difference Hash (Vertical dHash)
            dhash_vert = imagehash.dhash_vertical(img)
            print(f"Vertical dHash:        {dhash_vert}")

            # Wavelet Hash (wHash)
            # Uses Discrete Wavelet Transform (DWT). Often better than pHash.
            whash = imagehash.whash(img)
            print(f"Wavelet Hash (wHash):  {whash}")
            
            # Color Hash
            # Considers color distribution instead of just structural/grayscale features.
            color_hash = imagehash.colorhash(img)
            print(f"Color Hash:            {color_hash}")
            
            # Crop-resistant Hash
            # Specifically designed to be robust against cropping.
            crop_hash = imagehash.crop_resistant_hash(img)
            print(f"Crop-Resistant Hash:   {crop_hash}")
            
            print("-" * 50)
            
    except Exception as e:
        print(f"Error processing image '{image_path}': {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python Perceptual_Hashing.py <path_to_image>")
    else:
        generate_all_hashes(sys.argv[1])
