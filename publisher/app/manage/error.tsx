"use client";

type ManageErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ManageErrorPage({
  error,
  reset,
}: ManageErrorPageProps) {
  const message = error?.message?.trim() || "管理页加载失败，请刷新后重试。";

  return (
    <main className="publisher-shell">
      <section className="manager-panel">
        <div className="publisher-header">
          <div>
            <p className="publisher-kicker">TDP 管理台</p>
            <h1>内容管理暂时不可用</h1>
            <p className="publisher-subtitle">
              这不会影响主站公开页。你可以先刷新管理台，或者返回发布台继续工作。
            </p>
          </div>
          <div className="publisher-actions">
            <a href="/" className="ghost">
              返回发布台
            </a>
            <button type="button" className="ghost" onClick={reset}>
              重试
            </button>
          </div>
        </div>

        <div className="error-box">{message}</div>
      </section>
    </main>
  );
}
