import LocalePostPage from "../../[locale]/posts/[slug]/page";
import { getDefaultPostDetailStaticParams } from "@/lib/detailRouteParams";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getDefaultPostDetailStaticParams();
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  return LocalePostPage({
    params: Promise.resolve({ locale: "zh" as const, slug }),
  });
}
