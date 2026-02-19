import LocalePostsPage from "../[locale]/posts/page";

export const dynamic = "force-dynamic";

export default function PostsPage() {
  return LocalePostsPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
