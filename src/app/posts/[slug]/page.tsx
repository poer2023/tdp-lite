import LocalePostPage from "../../[locale]/posts/[slug]/page";

export const dynamic = "force-dynamic";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  return LocalePostPage({
    params: Promise.resolve({ locale: "zh" as const, slug }),
  });
}
