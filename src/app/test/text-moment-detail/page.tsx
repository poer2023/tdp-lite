"use client";

import { useState } from "react";
import { TextMomentDetailCard } from "@/components/bento/cards/TextMomentDetailCard";
import type { Moment } from "@/lib/schema";

// Mock data for testing text-only moments
const mockMoments: Moment[] = [
  {
    id: "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
    content:
      "The silence of a Sunday morning in Tokyo is not a void, but a weight. It's the collective breath of ten million souls, held in perfect, fragile unison.",
    media: [],
    locale: "en",
    visibility: "public",
    status: "published",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    location: {
      name: "Shinjuku • Tokyo",
      lat: 35.69,
      lng: 139.7,
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    deletedAt: null,
  },
  {
    id: "t2b3c4d5-e6f7-8901-bcde-f23456789012",
    content:
      "We are all just walking each other home. The path winds, sometimes steep, sometimes gentle, but never truly alone.",
    media: [],
    locale: "en",
    visibility: "public",
    status: "published",
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    location: {
      name: "Kyoto",
      lat: 35.01,
      lng: 135.77,
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    deletedAt: null,
  },
  {
    id: "t3c4d5e6-f7a8-9012-cdef-345678901234",
    content:
      "In the space between heartbeats, between one thought and the next, there exists an infinite stillness waiting to be noticed.",
    media: [],
    locale: "en",
    visibility: "public",
    status: "published",
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    location: null,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    deletedAt: null,
  },
];

export default function TextMomentDetailTestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#e9e9e7] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-semibold text-[#1a1a1a]">
            TextMomentDetailCard Test
          </h1>
          <p className="text-[#666666] text-sm">
            Testing the text-only detail card with paper stack effect
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-[#2b2b2b] text-white rounded-lg text-sm"
          >
            Show Card
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % mockMoments.length)}
            className="px-4 py-2 bg-black/5 rounded-lg text-sm text-[#1a1a1a]"
          >
            Next Moment ({currentIndex + 1}/{mockMoments.length})
          </button>
        </div>

        {/* Modal overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6 md:p-12"
            onClick={handleClose}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <TextMomentDetailCard
                moment={mockMoments[currentIndex]}
                index={currentIndex + 82}
              />
            </div>
          </div>
        )}

        {/* Closed state */}
        {!isOpen && (
          <div className="text-center py-12 text-[#666666]">
            Card closed. Click &quot;Show Card&quot; to reopen.
          </div>
        )}
      </div>
    </div>
  );
}
