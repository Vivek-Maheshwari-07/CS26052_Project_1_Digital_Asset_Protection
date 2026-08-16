import React, { useState } from 'react';
import ImageCard from './ImageCard';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

const ImageGrid = ({ images, isLoading }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <div
            key={idx}
            className="bg-white border border-[#E5E5E5] rounded-lg p-3 space-y-2 animate-pulse"
          >
            <div className="aspect-[4/3] bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-lg p-8 text-center my-4">
        <p className="text-sm font-medium text-[#111111]">No images found</p>
        <p className="text-xs text-[#666666] mt-1">Try searching for a different image name or creator.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <ImageCard key={img.id} image={img} onClick={(item) => setSelectedImage(item)} />
        ))}
      </div>

      {/* Simple Image Modal */}
      {selectedImage && (
        <Modal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          title={selectedImage.title}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-gray-100 border border-[#E5E5E5]">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.title}
                className="w-full max-h-80 object-contain"
              />
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-[#111111]">{selectedImage.title}</p>
              <p className="text-xs text-[#666666]">{selectedImage.creatorName}</p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedImage(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ImageGrid;
