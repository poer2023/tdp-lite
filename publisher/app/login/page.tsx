import { redirect } from "next/navigation";
import {
  getPublisherSession,
  normalizePublisherNextPath,
  publisherAuthConfigured,
} from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublisherLoginPage({
  searchParams,
}: LoginPageProps) {
  const session = await getPublisherSession();
  if (session) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const error = firstValue(resolvedSearchParams.error);
  const nextPath = normalizePublisherNextPath(
    firstValue(resolvedSearchParams.next)
  );
  const isConfigured = publisherAuthConfigured();

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="publisher-kicker">TDP 发布台</p>
        <h1>账号登录</h1>
        <p className="auth-subtitle">
          发布和管理台现在需要账密登录，登录后才可以访问页面和接口。
        </p>

        {!isConfigured ? (
          <div className="auth-error">
            未配置发布台登录凭据。请先设置
            <code>PUBLISHER_AUTH_USERNAME</code>、
            <code>PUBLISHER_AUTH_PASSWORD</code> 和
            <code>PUBLISHER_SESSION_SECRET</code>。
          </div>
        ) : null}

        {error === "invalid" ? (
          <div className="auth-error">账号或密码错误。</div>
        ) : null}

        {error === "config" ? (
          <div className="auth-error">发布台登录配置不完整。</div>
        ) : null}

        <form
          className="auth-form"
          method="post"
          action="/api/auth/login"
          autoComplete="on"
        >
          <input type="hidden" name="next" value={nextPath} />

          <label>
            账号
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="请输入账号"
              required
            />
          </label>

          <label>
            密码
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              required
            />
          </label>

          <button type="submit" className="primary" disabled={!isConfigured}>
            登录
          </button>
        </form>
      </section>
    </main>
  );
}
