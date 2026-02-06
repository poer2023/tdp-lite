"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Layers,
  MessageCircle,
  FileText,
  Image,
  LogOut,
  Trash2,
  Send,
  Upload,
  X,
} from "lucide-react";
import { createMoment, createPost, createGallery, deleteContent } from "@/lib/actions";
import type { Post, Moment, GalleryItem } from "@/lib/schema";

type Tab = "moment" | "post" | "gallery";

interface AdminDashboardProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  initialPosts: Post[];
  initialMoments: Moment[];
  initialGallery: GalleryItem[];
}

export function AdminDashboard({
  user,
  initialPosts,
  initialMoments,
  initialGallery,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("moment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [moments, setMoments] = useState(initialMoments);
  const [galleryItems, setGalleryItems] = useState(initialGallery);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "moment", label: "Moment", icon: <MessageCircle className="h-4 w-4" /> },
    { id: "post", label: "Post", icon: <FileText className="h-4 w-4" /> },
    { id: "gallery", label: "Gallery", icon: <Image className="h-4 w-4" /> },
  ];

  async function handleMomentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newMoment = await createMoment(formData);
      setMoments([newMoment, ...moments]);
      e.currentTarget.reset();
    } catch (err) {
      console.error("Failed to create moment:", err);
      alert("Failed to create moment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePostSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newPost = await createPost(formData);
      setPosts([newPost, ...posts]);
      e.currentTarget.reset();
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGallerySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newItem = await createGallery(formData);
      setGalleryItems([newItem, ...galleryItems]);
      e.currentTarget.reset();
    } catch (err) {
      console.error("Failed to create gallery item:", err);
      alert("Failed to create gallery item");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(type: "moment" | "post" | "gallery", id: string) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteContent(type, id);
      if (type === "moment") {
        setMoments(moments.filter((m) => m.id !== id));
      } else if (type === "post") {
        setPosts(posts.filter((p) => p.id !== id));
      } else {
        setGalleryItems(galleryItems.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete item");
    }
  }

  return (
    <div className="min-h-screen bg-[#e9e9e7] font-display">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-black/5 bg-white shadow-sm">
              <Layers className="h-5 w-5 text-[#111]" />
            </div>
            <div>
              <h1 className="font-semibold text-[#111]">Admin</h1>
              <p className="font-mono text-[10px] text-[#666]">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#666] transition-colors hover:border-black/20 hover:text-[#111]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-black/5 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#111] text-white shadow-sm"
                  : "text-[#666] hover:bg-black/5 hover:text-[#111]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
          {/* Moment Tab */}
          {activeTab === "moment" && (
            <div>
              <form onSubmit={handleMomentSubmit} className="mb-6">
                <textarea
                  name="content"
                  placeholder="What's on your mind?"
                  rows={3}
                  required
                  className="mb-3 w-full resize-none rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm text-[#666] transition-colors hover:border-black/20">
                    <Upload className="h-4 w-4" />
                    Add images
                    <input type="file" name="images" accept="image/*" multiple className="hidden" />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-black disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Post
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#666]">Recent Moments</h3>
                {moments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#999]">No moments yet</p>
                ) : (
                  moments.map((moment) => (
                    <div
                      key={moment.id}
                      className="group flex items-start justify-between rounded-xl border border-black/5 bg-[#f4f4f2] p-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-[#111]">{moment.content}</p>
                        <p className="mt-1 font-mono text-[10px] text-[#999]">
                          {new Date(moment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete("moment", moment.id)}
                        className="ml-3 rounded-lg p-2 text-[#999] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Post Tab */}
          {activeTab === "post" && (
            <div>
              <form onSubmit={handlePostSubmit} className="mb-6 space-y-3">
                <input
                  name="title"
                  type="text"
                  placeholder="Post title"
                  required
                  className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
                />
                <textarea
                  name="content"
                  placeholder="Write your post content (Markdown supported)"
                  rows={6}
                  required
                  className="w-full resize-none rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
                />
                <input
                  name="excerpt"
                  type="text"
                  placeholder="Short excerpt (optional)"
                  className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm text-[#666] transition-colors hover:border-black/20">
                      <Upload className="h-4 w-4" />
                      Cover
                      <input type="file" name="cover" accept="image/*" className="hidden" />
                    </label>
                    <select
                      name="status"
                      defaultValue="draft"
                      className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#666]"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-black disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Create
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#666]">Recent Posts</h3>
                {posts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#999]">No posts yet</p>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="group flex items-start justify-between rounded-xl border border-black/5 bg-[#f4f4f2] p-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[#111]">{post.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              post.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {post.status}
                          </span>
                          <span className="font-mono text-[10px] text-[#999]">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete("post", post.id)}
                        className="ml-3 rounded-lg p-2 text-[#999] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div>
              <form onSubmit={handleGallerySubmit} className="mb-6">
                <div className="mb-3 flex items-center gap-3">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 bg-[#f4f4f2] px-4 py-8 text-[#666] transition-colors hover:border-black/20">
                    <Upload className="h-5 w-5" />
                    <span>Select image</span>
                    <input type="file" name="image" accept="image/*" required className="hidden" />
                  </label>
                </div>
                <input
                  name="title"
                  type="text"
                  placeholder="Title (optional)"
                  className="mb-3 w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-black disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              </form>

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#666]">Recent Photos</h3>
                {galleryItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#999]">No photos yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {galleryItems.map((item) => (
                      <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl">
                        <img
                          src={item.thumbUrl || item.fileUrl}
                          alt={item.title || "Gallery image"}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleDelete("gallery", item.id)}
                          className="absolute right-2 top-2 rounded-lg bg-black/50 p-2 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
