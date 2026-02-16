import {
  Terminal,
  Wind,
  Atom,
  Hexagon,
  Cloud,
  Figma,
  Box,
  BookOpen,
  AtSign,
  Github,
  FileText,
  Mail,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { BottomNav } from "@/components/BottomNav";
import { db } from "@/lib/db";
import { posts, moments, gallery } from "@/lib/schema";
import { eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

interface AboutPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  // Query real counts from database
  const [postsCount, momentsCount, galleryCount] = await Promise.all([
    db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.status, "published")),
    db
      .select({ count: count() })
      .from(moments)
      .where(eq(moments.visibility, "public")),
    db.select({ count: count() }).from(gallery),
  ]);

  const techStack = [
    { name: "Tailwind", icon: Wind },
    { name: "React", icon: Atom },
    { name: "Next.js", icon: Hexagon },
    { name: "Vercel", icon: Cloud },
    { name: "Figma", icon: Figma },
    { name: "Three.js", icon: Box },
  ];

  const activity = [
    { value: String(postsCount[0].count), label: "Articles Published" },
    { value: String(momentsCount[0].count), label: "Daily Moments" },
    { value: String(galleryCount[0].count), label: "Analog Photos" },
  ];

  const socialLinks = [
    { name: "X / Twitter", href: "https://twitter.com", icon: AtSign },
    { name: "Github", href: "https://github.com", icon: Github },
    { name: "Read.cv", href: "https://read.cv", icon: FileText },
    { name: "Email", href: "mailto:hello@example.com", icon: Mail },
  ];

  return (
    <>
      {/* Noise overlay */}
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 mix-blend-multiply" />

      <div className="pearlescent text-ink min-h-screen overflow-x-hidden pb-32 font-display selection:bg-black/10 selection:text-black">
        <div className="relative z-10 mx-auto max-w-[1240px] px-8 pt-24 md:px-16">
          {/* Header */}
          <header className="mb-24 flex flex-col items-center gap-16 md:flex-row md:items-start">
            {/* Avatar */}
            <div className="group relative">
              <div className="relative h-56 w-56 rotate-[-3deg] overflow-hidden rounded-[3rem] border-[14px] border-white paper-stack-shadow transition-transform duration-700 group-hover:rotate-0 md:h-64 md:w-64">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy47viAR_LjhRiYmNAvIcG2Sls2o3grioez7j8CegtDxl-vr2YIA6NnC0g9i36Zj2EPGb3DhzFZQI9DN9jY-kQ-gx1cbrC3OQAvN5s-MC-vkWWti4cA6TwsHXT32V_DZqi8fVqx40OS-BMgP0jvEl4_AAjbkI81JzhVEV8O_GEXKaTfGE1k46yqh_-Z8SAut64Kiied5kkt_8yOLpFf_uUEtfh-YL2Am5CO3lsNWxbIt39Mg1DmLaQ0vnJDei6dbS28mrXzQQndzO1"
                  alt="User profile"
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 16rem, 14rem"
                  className="object-cover contrast-[1.05] brightness-[0.98] grayscale-[0.05]"
                />
              </div>
              <div className="bg-ink absolute -bottom-6 -right-6 rotate-6 rounded-2xl px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white paper-stack-shadow">
                EST. 2024
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-6 text-center md:text-left">
              <h1 className="mb-8 font-serif text-7xl font-bold tracking-tight md:text-8xl">
                Alex{" "}
                <span className="text-ink-light italic font-normal">
                  Rivers
                </span>
              </h1>
              <p className="text-ink-light max-w-3xl text-2xl font-light leading-[1.6] md:text-3xl">
                Digital craftsman and minimalist explorer. Designing quiet
                interfaces for a loud world. Currently based in Tokyo, weaving
                together bits, bytes, and broken reflections.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-5 md:justify-start">
                <div className="flex items-center gap-3 rounded-full border border-white/50 bg-white/80 px-6 py-3 backdrop-blur paper-stack-shadow">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                  <span className="text-ink font-mono text-sm uppercase tracking-[0.15em]">
                    Available for hire
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Bento Grid */}
          <div className="grid auto-rows-min grid-cols-1 gap-8 md:grid-cols-6 lg:grid-cols-12">
            {/* Tech Stack */}
            <div className="bento-card-about col-span-1 md:col-span-3 lg:col-span-5">
              <div className="mb-12 flex items-start justify-between">
                <h3 className="text-ink-light font-mono text-sm font-bold uppercase tracking-[0.25em]">
                  Tech Stack
                </h3>
                <Terminal className="h-7 w-7 text-black/15" />
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-10">
                {techStack.map((tech) => {
                  const Icon = tech.icon;
                  return (
                    <div
                      key={tech.name}
                      className="group flex cursor-default flex-col items-center gap-4"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-paper-grey shadow-sm transition-all duration-300 group-hover:bg-[#111] group-hover:text-white">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-ink-light font-mono text-[11px] font-semibold uppercase tracking-widest group-hover:text-[#111]">
                        {tech.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity */}
            <div className="bento-card-about col-span-1 flex flex-col justify-between bg-gradient-to-br from-paper-off-white to-paper-grey md:col-span-3 lg:col-span-3">
              <h3 className="text-ink-light mb-10 font-mono text-sm font-bold uppercase tracking-[0.25em]">
                Activity
              </h3>
              <div className="space-y-8">
                {activity.map((item, index) => (
                  <div key={item.label}>
                    <span className="text-ink font-serif text-5xl font-bold">
                      {item.value}
                    </span>
                    <p className="text-ink-light mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
                      {item.label}
                    </p>
                    {index < activity.length - 1 && (
                      <div className="mt-8 h-px bg-black/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Currently Reading */}
            <div className="bento-card-about group relative col-span-1 md:col-span-6 lg:col-span-4 overflow-hidden">
              <div className="absolute right-0 top-0 p-10">
                <BookOpen className="h-12 w-12 text-black/5" />
              </div>
              <h3 className="text-ink-light mb-8 font-mono text-sm font-bold uppercase tracking-[0.25em]">
                Currently Reading
              </h3>
              <div className="flex gap-6 items-start">
                <div className="relative h-40 w-28 shrink-0 rotate-[-6deg] overflow-hidden rounded-2xl border border-black/5 bg-paper-grey transition-transform paper-stack-shadow group-hover:rotate-0">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiAlc_Yk4SdPoZ6_R2pnELqovwoEgd4huXGJ7pH3cQD8Z7kLfVckop0Xm8E3uly53SSaExVIgxCvnjbLyMPfQgUoZDNxiJMrNNrf3O9hju-GLwGpwmlpTLfGAyZCNF53lOG6Ce70FSHXDpRa-HYQNJjqcpDV5jJhJy-gsmez6NMPuUwDLbSxmiCMpJ6Ci4475ZsYptBDkfyeuz8CMFzkA2vTMxYx5kCT2EV8H7rSRopWd42Ewky4nyGrL8dSzhuXdOfKkZZhl5C4oJ"
                    alt="Book cover"
                    fill
                    unoptimized
                    sizes="7rem"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-ink mb-2 text-xl font-bold leading-tight">
                    The Architecture of Happiness
                  </h4>
                  <p className="text-ink-light font-mono text-sm font-bold">
                    Alain de Botton
                  </p>
                  <div className="mt-5">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-grey shadow-inner">
                      <div className="bg-ink h-full w-[65%] rounded-full" />
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-ink-light font-mono text-[11px] font-bold uppercase tracking-widest">
                        Progress
                      </span>
                      <span className="text-ink font-mono text-[11px] font-bold">
                        65%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connectivity */}
            <div className="bento-card-about col-span-1 bg-gradient-to-br from-white to-paper-off-white md:col-span-3 lg:col-span-4">
              <h3 className="text-ink-light mb-10 font-mono text-sm font-bold uppercase tracking-[0.25em]">
                Connectivity
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      className="group flex items-center gap-5 rounded-[1.5rem] bg-paper-grey p-5 shadow-sm transition-all hover:bg-[#111] hover:text-white"
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="pill-icon h-12 w-12 group-hover:bg-white group-hover:text-[#111]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
                        {link.name}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Leave a footprint */}
            <div className="bento-card-about col-span-1 flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-black/5 bg-paper-grey py-16 text-center transition-colors hover:border-black/10 md:col-span-3 lg:col-span-8">
              <div className="group mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white transition-transform duration-500 paper-stack-shadow hover:scale-110">
                <Plus className="text-ink h-8 w-8" />
              </div>
              <h3 className="text-ink mb-4 font-serif text-4xl italic">
                Leave a footprint
              </h3>
              <p className="text-ink-light font-mono text-sm font-bold uppercase tracking-[0.25em]">
                Anonymous Message / Collaboration Request
              </p>
              <div className="bg-ink mt-10 rounded-full px-8 py-4 font-mono text-xs uppercase tracking-[0.25em] text-white transition-transform hover:scale-105">
                Initialize Transmission
              </div>
            </div>
          </div>
        </div>

        <BottomNav locale={locale} activeTab="about" />
      </div>
    </>
  );
}
