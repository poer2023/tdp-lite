"use client";

import { useState } from "react";
import { MomentDetailCard } from "@/components/bento/cards/MomentDetailCard";
import type { Moment } from "@/lib/schema";

// Mock data for testing
const mockMoments: Moment[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    content:
      "The morning light filtered through the bamboo grove, casting long shadows across the moss-covered stones. In moments like these, time seems to slow down, allowing us to appreciate the simple beauty that surrounds us.",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
        width: 800,
        height: 600,
      },
    ],
    locale: "en",
    visibility: "public",
    location: {
      name: "Northern Alps, Japan",
      lat: 36.72,
      lng: 137.6,
    },
    createdAt: new Date("2023-10-14"),
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    content:
      "City lights reflected in the rain-soaked streets, creating a symphony of colors that danced with each passing car. The urban jungle has its own kind of beauty.",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop",
        width: 800,
        height: 600,
      },
    ],
    locale: "en",
    visibility: "public",
    location: {
      name: "Shibuya, Tokyo",
      lat: 35.66,
      lng: 139.7,
    },
    createdAt: new Date("2023-11-02"),
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-345678901234",
    content:
      "Sometimes the best moments are the ones we don't plan. A chance encounter, an unexpected view, a fleeting smile from a stranger.",
    media: [],
    locale: "en",
    visibility: "public",
    location: null,
    createdAt: new Date("2024-01-15"),
  },
];

export default function MomentDetailTestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen bg-textured p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-semibold">
            MomentDetailCard Test
          </h1>
          <p className="text-muted-foreground text-sm">
            Testing the detail card component with mock data
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Show Card
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % mockMoments.length)}
            className="px-4 py-2 bg-black/5 dark:bg-white/10 rounded-lg text-sm"
          >
            Next Moment
          </button>
        </div>

        {/* Modal overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
            onClick={handleClose}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <MomentDetailCard
                moment={mockMoments[currentIndex]}
                index={currentIndex + 1}
              />
            </div>
          </div>
        )}

        {/* Closed state */}
        {!isOpen && (
          <div className="text-center py-12 text-muted-foreground">
            Card closed. Click &quot;Show Card&quot; to reopen.
          </div>
        )}
      </div>
    </div>
  );
}
