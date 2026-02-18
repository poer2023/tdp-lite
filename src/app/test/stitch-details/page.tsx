import {
  ArticlePaperDetail,
  GalleryMomentDetail,
  MusicMomentDetail,
  TextMomentPaperDetail,
} from "@/components/stitch-details";

const avatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBy47viAR_LjhRiYmNAvIcG2Sls2o3grioez7j8CegtDxl-vr2YIA6NnC0g9i36Zj2EPGb3DhzFZQI9DN9jY-kQ-gx1cbrC3OQAvN5s-MC-vkWWti4cA6TwsHXT32V_DZqi8fVqx40OS-BMgP0jvEl4_AAjbkI81JzhVEV8O_GEXKaTfGE1k46yqh_-Z8SAut64Kiied5kkt_8yOLpFf_uUEtfh-YL2Am5CO3lsNWxbIt39Mg1DmLaQ0vnJDei6dbS28mrXzQQndzO1";

const galleryImages = [
  {
    id: "1",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCiAlc_Yk4SdPoZ6_R2pnELqovwoEgd4huXGJ7pH3cQD8Z7kLfVckop0Xm8E3uly53SSaExVIgxCvnjbLyMPfQgUoZDNxiJMrNNrf3O9hju-GLwGpwmlpTLfGAyZCNF53lOG6Ce70FSHXDpRa-HYQNJjqcpDV5jJhJy-gsmez6NMPuUwDLbSxmiCMpJ6Ci4475ZsYptBDkfyeuz8CMFzkA2vTMxYx5kCT2EV8H7rSRopWd42Ewky4nyGrL8dSzhuXdOfKkZZhl5C4oJ",
    width: 1600,
    height: 980,
  },
  {
    id: "2",
    src: avatar,
    width: 1000,
    height: 1500,
  },
  {
    id: "3",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuApRnP1s9aGex6aGiXo2n60WdHt1Azrdl6y6bDm-t8bDxcqQsVpzeOozYllnQYi1t9ggBHQyrWN83e55POkNn0CP2ujPmbZnpA9q8xE6hdJzfA_CPyIHZM5JJmauCHBcpCKjW6FmZBzhghbm5a6GBcfM6zJYtlp_J9lzDGEW8ShWmvaq0SPNu9HShmR7VqaXQSKOvvH7_2BgkDOqovhveQtSEU28Q9BOerFUzaprzy1QdvwqLyVBL3jjuPZYl9P7fI-qVT2z0mHs3es",
    width: 1600,
    height: 1000,
  },
  {
    id: "4",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFl89yuHHUtvxFgar418lvnLXp-bhrXJmtdcgv8nr-DMSgiu3K_wqyC2QTtJaBiSGtBwTFvKt2H2EmqsfCRWVJAFn-qbjBBOHT2WAvbGZoxJnbu34AeOA9eh8q7rvjpv9lT-q5msAH9y3DU7Kqkz1Tzim47ZMfdztB8VymVIojMJYygMH_MpNb8BXf3opvEtg8ryoKY7eGSgYeXftvxS7oXNmU1_1nLmbtvm3eStW-CyW86bLIj4N25qgSFQ9qC49lxZ3RBg6ILhX3",
    width: 980,
    height: 1500,
  },
];

const portraitGalleryImagesA = [
  {
    id: "pa-1",
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=980&fit=crop&auto=format&q=80",
    width: 1600,
    height: 980,
  },
  {
    id: "pa-2",
    src: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1000&h=1500&fit=crop&auto=format&q=80",
    width: 1000,
    height: 1500,
  },
  {
    id: "pa-3",
    src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1700&h=1000&fit=crop&auto=format&q=80",
    width: 1700,
    height: 1000,
  },
  {
    id: "pa-4",
    src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=1000&h=1500&fit=crop&auto=format&q=80",
    width: 1000,
    height: 1500,
  },
];

const portraitGalleryImagesB = [
  {
    id: "pb-1",
    src: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=900&h=1400&fit=crop&auto=format&q=80",
    width: 900,
    height: 1400,
  },
  {
    id: "pb-2",
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&h=1400&fit=crop&auto=format&q=80",
    width: 900,
    height: 1400,
  },
  {
    id: "pb-3",
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&h=1400&fit=crop&auto=format&q=80",
    width: 900,
    height: 1400,
  },
  {
    id: "pb-4",
    src: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=900&h=1400&fit=crop&auto=format&q=80",
    width: 900,
    height: 1400,
  },
];

function ComponentLabel({
  name,
  file,
  nodeId,
}: {
  name: string;
  file: string;
  nodeId: string;
}) {
  return (
    <div className="lg-panel-medium rounded-xl border border-black/10 bg-white/70 p-4">
      <p className="text-ink font-display text-lg font-semibold">{name}</p>
      <p className="text-ink-light mt-1 font-mono text-[11px]">
        file: <code>{file}</code>
      </p>
      <p className="text-ink-light mt-1 font-mono text-[11px]">
        stitch node-id: <code>{nodeId}</code>
      </p>
    </div>
  );
}

export default function StitchDetailsTestPage() {
  return (
    <div className="space-y-16 bg-[#e8e8e6] p-6 md:p-10">
      <h1 className="text-ink font-display text-3xl font-semibold">
        Stitch Detail Components Showcase
      </h1>

      <section id="gallery-moment-detail" className="space-y-4">
        <ComponentLabel
          name="GalleryMomentDetail"
          file="src/components/stitch-details/GalleryMomentDetail.tsx"
          nodeId="dfae6d3bf59c428eb653fae58a9fb39a"
        />
        <GalleryMomentDetail
          title="Finding Stillness in Chaos"
          author="Alexander V."
          seriesLabel="Perspective Series"
          paragraphs={[
            "Exploring the untouched wilderness of the northern highlands, seeking a moment of absolute silence. There is a specific kind of weight that only true stillness carries.",
            "It is not the absence of sound, but rather the presence of everything at once, harmonized. As the fog rolled through the valley, the world narrowed down.",
          ]}
          images={galleryImages}
          initialIndex={1}
          avatarSrc={avatar}
          showDock={false}
        />
      </section>

      <section id="gallery-moment-detail-portrait-a" className="space-y-4">
        <ComponentLabel
          name="GalleryMomentDetail (Portrait Mock A)"
          file="src/components/stitch-details/GalleryMomentDetail.tsx"
          nodeId="dfae6d3bf59c428eb653fae58a9fb39a"
        />
        <GalleryMomentDetail
          title="Portrait Focus Series"
          author="Portrait Mock"
          seriesLabel="Vertical Portraits"
          paragraphs={[
            "Mock A: 横竖图混合（16:10 + 2:3），用于观察左侧容器在横竖切换时的形变和布局重排。",
            "你可以快速切换图片，感受从横图到竖图再回横图时的过渡是否丝滑。",
          ]}
          images={portraitGalleryImagesA}
          initialIndex={0}
          avatarSrc={avatar}
          showDock={false}
        />
      </section>

      <section id="gallery-moment-detail-portrait-b" className="space-y-4">
        <ComponentLabel
          name="GalleryMomentDetail (Portrait Mock B)"
          file="src/components/stitch-details/GalleryMomentDetail.tsx"
          nodeId="dfae6d3bf59c428eb653fae58a9fb39a"
        />
        <GalleryMomentDetail
          title="Portrait Mood Set"
          author="Portrait Mock"
          seriesLabel="Vertical Portraits"
          paragraphs={[
            "Mock B: 纯竖图样本，缩略图改为桌面端右侧竖排，提升主图可视面积。",
            "移动端仍保持底部缩略图，便于在窄屏下浏览和切换。",
          ]}
          images={portraitGalleryImagesB}
          initialIndex={1}
          avatarSrc={avatar}
          showDock={false}
          thumbnailPlacement="right"
        />
      </section>

      <section id="text-moment-paper-detail" className="space-y-4">
        <ComponentLabel
          name="TextMomentPaperDetail"
          file="src/components/stitch-details/TextMomentPaperDetail.tsx"
          nodeId="d4a426ed800446f98e02811ca9a5e079"
        />
        <TextMomentPaperDetail
          quote="The silence of a Sunday morning in Tokyo is not a void, but a weight. It is the collective breath of ten million souls, held in perfect, fragile unison."
          timeLabel="2h ago"
          locationLabel="Shinjuku • Tokyo"
          fragmentLabel="Fragment 082 / Series 12"
          showDock={false}
        />
      </section>

      <section id="music-moment-detail" className="space-y-4">
        <ComponentLabel
          name="MusicMomentDetail"
          file="src/components/stitch-details/MusicMomentDetail.tsx"
          nodeId="667bb43f78174b8d9ac19eb5ec3e739b"
        />
        <MusicMomentDetail
          title="Midnight City"
          artist="M83"
          album="Hurry Up, We're Dreaming"
          sourceId="AUDIO_MOMENT_083"
          coverImage="https://lh3.googleusercontent.com/aida-public/AB6AXuApRnP1s9aGex6aGiXo2n60WdHt1Azrdl6y6bDm-t8bDxcqQsVpzeOozYllnQYi1t9ggBHQyrWN83e55POkNn0CP2ujPmbZnpA9q8xE6hdJzfA_CPyIHZM5JJmauCHBcpCKjW6FmZBzhghbm5a6GBcfM6zJYtlp_J9lzDGEW8ShWmvaq0SPNu9HShmR7VqaXQSKOvvH7_2BgkDOqovhveQtSEU28Q9BOerFUzaprzy1QdvwqLyVBL3jjuPZYl9P7fI-qVT2z0mHs3es"
          annotation="Captured during a late-night walk through Shinjuku. The neon lights reflected against the damp pavement perfectly matched the synth-wave progression of this track."
          fileMeta={[
            "ENCODER: LAME3.99r",
            "BITRATE: 320 KBPS",
            "FREQ: 44.1 KHZ",
          ]}
          geoMeta={[
            "LAT: 35.6938 | LON: 139.7034",
            "TIMESTAMP: OCT_24_2023_0214_HRS",
            "FILE_ID: MOMENT_AUD_V2_44",
          ]}
          progress={0.7}
          currentTime="2:58"
          duration="4:03"
          showDock={false}
        />
      </section>

      <section id="article-paper-detail" className="space-y-4">
        <ComponentLabel
          name="ArticlePaperDetail"
          file="src/components/stitch-details/ArticlePaperDetail.tsx"
          nodeId="16ae00a9b68b4120814a42dc02f65537"
        />
        <ArticlePaperDetail
          title="Digital"
          accentTitle="Minimalism"
          excerpt="How reducing digital clutter can lead to a more profound sense of clarity in an increasingly noisy world."
          kicker="Reflections"
          publishedDate="Oct 24, 2023"
          readingTime="5 min read"
          category="Journal"
          location="Shinjuku"
          author="Alex M."
          statusValue="READING • TOKYO"
          avatarSrc={avatar}
          showDock={false}
          content={
            <>
              <p>
                We live in an era of constant connectivity. The buzz of
                notifications has become the background score of our lives,
                subtly orchestrating our attention and fragmenting our focus.
              </p>
              <h2>The Noise of Now</h2>
              <p>
                It started with a simple observation: I was present, but not
                really there. Digital minimalism is not about rejecting
                technology; it is about intentionality and boundaries.
              </p>
              <h3>Reclaiming Attention</h3>
              <blockquote>
                The cost of a thing is the amount of life required to be
                exchanged for it.
              </blockquote>
              <p>
                By creating boundaries, we do not lose connection with the
                world; we deepen our connection with ourselves and find space to
                create work that matters.
              </p>
              <ul>
                <li>[01] No screens in the first hour of the day.</li>
                <li>[02] Phone stays in the hallway, not the bedroom.</li>
                <li>[03] Batch processing emails twice a day.</li>
              </ul>
            </>
          }
        />
      </section>
    </div>
  );
}
