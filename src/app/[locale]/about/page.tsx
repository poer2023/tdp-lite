import Link from "next/link";
import { Home, Grid3X3, Search, User } from "lucide-react";

type Locale = "en" | "zh";

interface AboutPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  const techStack = [
    { name: "Tailwind", icon: "html" },
    { name: "React", icon: "javascript" },
    { name: "Next.js", icon: "data_object" },
    { name: "Vercel", icon: "cloud" },
    { name: "Figma", icon: "draw" },
    { name: "Three.js", icon: "architecture" },
  ];

  const activity = [
    { value: "124", label: "Articles Published" },
    { value: "842", label: "Daily Moments" },
    { value: "3.2k", label: "Analog Photos" },
  ];

  const socialLinks = [
    { name: "X / Twitter", href: "https://twitter.com", icon: "alternate_email" },
    { name: "Github", href: "https://github.com", icon: "code" },
    { name: "Read.cv", href: "https://read.cv", icon: "description" },
    { name: "Email", href: "mailto:hello@example.com", icon: "mail" },
  ];

  return (
    <>
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none bg-noise mix-blend-multiply z-0" />

      <div className="pearlescent min-h-screen font-display text-ink overflow-x-hidden selection:bg-black/10 selection:text-black pb-32">
        <div className="max-w-[1240px] mx-auto px-8 md:px-16 pt-24 relative z-10">
          {/* Header */}
          <header className="flex flex-col md:flex-row items-center md:items-start gap-16 mb-24">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-56 h-56 md:w-64 md:h-64 rounded-[3rem] overflow-hidden paper-stack-shadow border-[14px] border-white rotate-[-3deg] transition-transform duration-700 group-hover:rotate-0">
                <img
                  alt="User profile"
                  className="w-full h-full object-cover filter contrast-[1.05] brightness-[0.98] grayscale-[0.05]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy47viAR_LjhRiYmNAvIcG2Sls2o3grioez7j8CegtDxl-vr2YIA6NnC0g9i36Zj2EPGb3DhzFZQI9DN9jY-kQ-gx1cbrC3OQAvN5s-MC-vkWWti4cA6TwsHXT32V_DZqi8fVqx40OS-BMgP0jvEl4_AAjbkI81JzhVEV8O_GEXKaTfGE1k46yqh_-Z8SAut64Kiied5kkt_8yOLpFf_uUEtfh-YL2Am5CO3lsNWxbIt39Mg1DmLaQ0vnJDei6dbS28mrXzQQndzO1"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-ink text-white px-5 py-2.5 paper-stack-shadow rounded-2xl rotate-6 text-[11px] font-mono tracking-[0.2em] uppercase">
                EST. 2024
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left pt-6">
              <h1 className="text-7xl md:text-8xl font-serif font-bold tracking-tight mb-8">
                Alex <span className="text-ink-light italic font-normal">Rivers</span>
              </h1>
              <p className="text-2xl md:text-3xl text-ink-light font-light leading-[1.6] max-w-3xl">
                Digital craftsman and minimalist explorer. Designing quiet interfaces for a loud world. Currently based in Tokyo, weaving together bits, bytes, and broken reflections.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-5 mt-10">
                <div className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur rounded-full paper-stack-shadow border border-white/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-mono uppercase tracking-[0.15em] text-ink">Available for hire</span>
                </div>
              </div>
            </div>
          </header>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 auto-rows-min">
            {/* Tech Stack */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-5">
              <div className="flex justify-between items-start mb-12">
                <h3 className="text-sm font-mono uppercase tracking-[0.25em] text-ink-light font-bold">Tech Stack</h3>
                <span className="material-symbols-outlined text-ink/30 text-3xl">terminal</span>
              </div>
              <div className="grid grid-cols-3 gap-y-10 gap-x-6">
                {techStack.map((tech) => (
                  <div key={tech.name} className="flex flex-col items-center gap-4 group cursor-default">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-paper-grey flex items-center justify-center group-hover:bg-ink group-hover:text-white transition-all duration-300 shadow-sm">
                      <span className="material-symbols-outlined text-3xl">{tech.icon}</span>
                    </div>
                    <span className="text-[11px] font-mono text-ink-light uppercase tracking-widest font-semibold group-hover:text-ink">
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-3 bg-gradient-to-br from-paper-off-white to-paper-grey flex flex-col justify-between">
              <h3 className="text-sm font-mono uppercase tracking-[0.25em] text-ink-light font-bold mb-10">Activity</h3>
              <div className="space-y-8">
                {activity.map((item, index) => (
                  <div key={item.label}>
                    <span className="text-5xl font-serif font-bold text-ink">{item.value}</span>
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-ink-light mt-2 font-semibold">
                      {item.label}
                    </p>
                    {index < activity.length - 1 && <div className="h-px bg-black/10 mt-8" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Currently Reading */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-4 group">
              <div className="absolute top-0 right-0 p-10">
                <span className="material-symbols-outlined text-ink/10 text-5xl">menu_book</span>
              </div>
              <h3 className="text-sm font-mono uppercase tracking-[0.25em] text-ink-light font-bold mb-12">Currently Reading</h3>
              <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-end">
                <div className="w-32 h-48 bg-paper-grey rounded-2xl paper-stack-shadow rotate-[-6deg] transition-transform group-hover:rotate-0 overflow-hidden shrink-0 border border-black/5">
                  <img
                    alt="Book cover"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiAlc_Yk4SdPoZ6_R2pnELqovwoEgd4huXGJ7pH3cQD8Z7kLfVckop0Xm8E3uly53SSaExVIgxCvnjbLyMPfQgUoZDNxiJMrNNrf3O9hju-GLwGpwmlpTLfGAyZCNF53lOG6Ce70FSHXDpRa-HYQNJjqcpDV5jJhJy-gsmez6NMPuUwDLbSxmiCMpJ6Ci4475ZsYptBDkfyeuz8CMFzkA2vTMxYx5kCT2EV8H7rSRopWd42Ewky4nyGrL8dSzhuXdOfKkZZhl5C4oJ"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-2xl font-bold leading-tight mb-3 text-ink">The Architecture of Happiness</h4>
                  <p className="text-sm text-ink-light font-mono font-bold">Alain de Botton</p>
                  <div className="mt-6">
                    <div className="h-2.5 w-full bg-paper-grey rounded-full overflow-hidden shadow-inner">
                      <div className="h-full w-[65%] bg-ink rounded-full" />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[11px] font-mono text-ink-light uppercase tracking-widest font-bold">Progress</span>
                      <span className="text-[11px] font-mono text-ink font-bold">65%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connectivity */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 bg-gradient-to-br from-white to-paper-off-white">
              <h3 className="text-sm font-mono uppercase tracking-[0.25em] text-ink-light font-bold mb-10">Connectivity</h3>
              <div className="grid grid-cols-1 gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-paper-grey hover:bg-ink hover:text-white transition-all group shadow-sm"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="pill-icon w-12 h-12 group-hover:bg-white group-hover:text-ink">
                      <span className="material-symbols-outlined text-2xl">{link.icon}</span>
                    </span>
                    <span className="text-xs font-mono uppercase tracking-[0.2em] font-bold">{link.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Leave a footprint */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-8 bg-paper-grey border-dashed border-4 border-black/5 hover:border-black/10 transition-colors flex flex-col justify-center items-center text-center py-16 group cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-white paper-stack-shadow flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-4xl text-ink">add</span>
              </div>
              <h3 className="text-4xl font-serif italic text-ink mb-4">Leave a footprint</h3>
              <p className="text-sm font-mono text-ink-light uppercase tracking-[0.25em] font-bold">
                Anonymous Message / Collaboration Request
              </p>
              <div className="mt-10 px-8 py-4 bg-ink text-white rounded-full text-xs font-mono uppercase tracking-[0.25em] hover:scale-105 transition-transform">
                Initialize Transmission
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Same as Homepage */}
        <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1.5 shadow-lg">
            <Link
              href={`/${locale}`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <Home className="h-5 w-5" />
            </Link>
            <Link
              href={`/${locale}/gallery`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <Grid3X3 className="h-5 w-5" />
            </Link>
            <Link
              href={`/${locale}/posts`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href={`/${locale}/about`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background"
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
