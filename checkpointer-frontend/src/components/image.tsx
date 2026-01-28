// Simple React component to fetch an image from a Cloudflare R2 bucket
// Assumes your R2 bucket is exposed via a public URL or Cloudflare Worker

import { useEffect, useState } from "react";

interface R2ImageViewerProps {
  imageUrl: string;
}

export default function R2ImageViewer({ imageUrl }: R2ImageViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Preload the image to detect errors
    const img = new window.Image();
    img.src = imageUrl;

    img.onload = () => {
      setLoading(false);
      setError(null);
    };

    img.onerror = () => {
      setLoading(false);
      setError("Failed to load image from R2");
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-gray-500">Loading image...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <img
        src={imageUrl}
        alt="From Cloudflare R2"
        className="max-w-full max-h-[80vh] rounded-2xl shadow-lg"
      />
    </div>
  );
}

// Usage example:
// <R2ImageViewer imageUrl="https://your-public-r2-domain.com/path/to/image.jpg" />
