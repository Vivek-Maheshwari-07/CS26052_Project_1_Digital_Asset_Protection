import React from "react";

export interface FramedImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  offset?: number;
}

export const FramedImage: React.FC<FramedImageProps> = ({
  src,
  alt,
  className = "",
  imageClassName = "",
  offset = 14,
}) => {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* Solid Cobalt Block Behind (Offset Bottom-Right) */}
      <div
        className="absolute bg-(--cobalt) pointer-events-none"
        style={{
          top: offset,
          left: offset,
          right: -offset,
          bottom: -offset,
        }}
        aria-hidden="true"
      />

      {/* Main Image on Paper without rounded corners */}
      <div className="relative border-2 border-(--ink) bg-(--paper) overflow-hidden z-10">
        <img
          src={src}
          alt={alt}
          className={`block w-full h-auto object-cover ${imageClassName}`}
          loading="lazy"
        />
      </div>
    </div>
  );
};
