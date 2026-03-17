import { notFound } from "next/navigation";
import { PostDetailPage } from "@/components/content/PostDetailPage";
import { getPublicPost } from "@/lib/content/read";
import { getPostDetailStaticParams } from "@/lib/detailRouteParams";
import { type AppLocale } from "@/lib/locale";

type Locale = AppLocale;

interface PostPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateStaticParams() {
  return getPostDetailStaticParams();
}

export default async function PostPage({ params }: PostPageProps) {
  const { locale, slug } = await params;

  const post = await getPublicPost(locale, slug);

  if (!post) {
    notFound();
  }

  return <PostDetailPage locale={locale} post={post} />;
}
