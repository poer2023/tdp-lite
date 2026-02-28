import LocalePostsPage from "../[locale]/posts/page";

export default function PostsPage() {
  return LocalePostsPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
