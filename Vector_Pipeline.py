import os
import argparse
import numpy as np

try:
    from PIL import Image
    import imagehash
    import faiss
except ImportError:
    print("Required libraries missing. Please install: pip install Pillow imagehash faiss-cpu numpy")
    exit(1)


class ImageHashIndexer:
    def __init__(self, hash_size=8):
        """
        Initializes the vector search pipeline for image perceptual hashes.
        hash_size=8 means a 64-bit hash (8x8), which fits into 8 bytes.
        """
        self.hash_size = hash_size
        self.vector_dim_bytes = (hash_size * hash_size) // 8
        
        # FAISS IndexBinaryFlat calculates exact Hamming distance (number of differing bits)
        # The dimensionality passed to faiss is the number of bits (64).
        self.index = faiss.IndexBinaryFlat(self.vector_dim_bytes * 8)
        self.image_paths = []

    def compute_hash_vector(self, image_path):
        """
        Computes the pHash of an image and converts it into a uint8 binary vector.
        """
        try:
            with Image.open(image_path) as img:
                # Using Perception Hash (pHash) as it's highly robust
                h = imagehash.phash(img, hash_size=self.hash_size)
                
                # h.hash is a 2D boolean array (8x8).
                # Flatten it to a 1D boolean array (length 64)
                bool_array = h.hash.flatten()
                
                # Pack the boolean array into 8-bit unsigned integers
                # 64 bits -> 8 bytes (uint8)
                uint8_vector = np.packbits(bool_array)
                return uint8_vector
        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            return None

    def add_image(self, image_path):
        """
        Hashes an image and adds it to the FAISS vector index.
        """
        vec = self.compute_hash_vector(image_path)
        if vec is not None:
            # FAISS expects a 2D array of shape (n_samples, d_bytes)
            vec_2d = np.expand_dims(vec, axis=0)
            self.index.add(vec_2d)
            self.image_paths.append(image_path)

    def add_directory(self, directory):
        """
        Recursively finds images in a directory, hashes them, and adds them to the index.
        """
        print(f"Scanning directory: {directory}")
        count = 0
        for root, _, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp')):
                    full_path = os.path.join(root, file)
                    self.add_image(full_path)
                    count += 1
        
        print(f"Added {count} images.")
        print(f"Total vectors in FAISS index: {self.index.ntotal}")

    def query(self, query_image_path, top_k=5):
        """
        Queries the vector database for the top_k most similar images based on Hamming distance.
        A distance of 0 means the hashes match exactly.
        """
        vec = self.compute_hash_vector(query_image_path)
        if vec is None:
            return []
        
        vec_2d = np.expand_dims(vec, axis=0)
        
        # FAISS search returns distances (Hamming) and the indices of the neighbors
        distances, indices = self.index.search(vec_2d, top_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            # FAISS returns -1 if there aren't enough vectors in the index
            if idx != -1 and idx < len(self.image_paths):
                results.append({
                    "path": self.image_paths[idx],
                    "distance": distances[0][i]
                })
                
        return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Image Perceptual Hash Vector Search Pipeline using FAISS")
    parser.add_argument("--index_dir", help="Directory of images to build the vector database from", type=str)
    parser.add_argument("--query", help="Path to an image to find similar images for", type=str)
    parser.add_argument("--top_k", help="Number of nearest neighbors to retrieve", type=int, default=5)
    
    args = parser.parse_args()
    
    if args.index_dir:
        # Initialize the pipeline
        pipeline = ImageHashIndexer()
        
        # Step 1: Indexing
        print("--- Step 1: Building Vector Database ---")
        pipeline.add_directory(args.index_dir)
        
        # Step 2: Querying
        if args.query:
            print("\n--- Step 2: Querying Vector Database ---")
            print(f"Finding top {args.top_k} nearest neighbors for: {args.query}")
            
            results = pipeline.query(args.query, top_k=args.top_k)
            
            print("\n--- Results (Hamming Distance) ---")
            print("Note: Distance 0 = Exact hash match. Distance < 10 = Very similar.")
            for i, res in enumerate(results, 1):
                print(f"Rank {i}: Distance = {res['distance']:<2} | File = {res['path']}")
    else:
        parser.print_help()
