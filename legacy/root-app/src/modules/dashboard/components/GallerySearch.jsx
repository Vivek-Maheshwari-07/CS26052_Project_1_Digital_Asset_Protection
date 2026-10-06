import React from 'react';

const GallerySearch = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="w-full">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search registered images..."
        className="w-full max-w-sm bg-white border border-[#E5E5E5] text-sm text-[#111111] placeholder-[#999999] px-3 py-2 rounded-lg focus:outline-none focus:border-[#111111]"
      />
    </div>
  );
};

export default GallerySearch;
