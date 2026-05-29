import { resolveAppBaseHref } from "./app-base";

export function SiteFooter() {
  const appBaseHref = resolveAppBaseHref();

  return (
    <footer className="site-footer" role="contentinfo">
      <nav className="site-footer-links" aria-label="Site links">
        <a href={`${appBaseHref}privacy/index.html`}>Privacy</a>
        <a href={`${appBaseHref}methodology/index.html`}>Methodology</a>
        <a href={`${appBaseHref}about/index.html`}>About</a>
        <a
          href="https://forms.gle/mqgPbWFLt9byHC7B8"
          target="_blank"
          rel="noreferrer noopener"
        >
          Feedback
        </a>
      </nav>
    </footer>
  );
}
