import React from 'react';

const ImageCard = ({ image, onClick }) => {
  return (
    <div
      onClick={() => onClick && onClick(image)}
      className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden transition-shadow duration-150 hover:shadow-sm cursor-pointer flex flex-col"
    >
      {/* Image Container */}
      <div className="aspect-[4/3] w-full bg-gray-100 overflow-hidden">
        <img
          src={image.imageUrl}
          alt={image.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Text Info */}
      <div className="p-3 flex flex-col justify-between flex-1 space-y-1">
        <h3 className="font-semibold text-sm text-[#111111] line-clamp-1">
          {image.title}
        </h3>
        <p className="text-xs text-[#666666]">
          {image.creatorName}
        </p>
      </div>
    </div>
  );
};

export default ImageCard;
