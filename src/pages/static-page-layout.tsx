import type { ReactNode } from "react";
import { resolveAppBaseHref } from "../app/app-base";
import { SiteFooter } from "../app/site-footer";
import { Helmet } from "../helmet";

type StaticPageLayoutProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  description?: string;
  children: ReactNode;
};

export function StaticPageLayout({
  eyebrow,
  title,
  lead,
  description,
  children,
}: StaticPageLayoutProps) {
  const appBaseHref = resolveAppBaseHref();

  return (
    <main className="app-shell">
      <Helmet>
        <title>{`${title} | Civil Service Pension Modeller`}</title>
        <meta
          name="description"
          content={description ?? lead ?? "Civil Service Pension Modeller"}
        />
      </Helmet>

      <section className="hero">
        <div className="hero-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {lead ? <p className="lead">{lead}</p> : null}
          <a className="static-backlink" href={appBaseHref}>
            Back to the modeller
          </a>
        </div>
      </section>

      <section className="panel static-panel">{children}</section>

      <SiteFooter />
    </main>
  );
}
