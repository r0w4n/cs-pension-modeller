import { resolveAppBaseHref } from "./app-base";

export function SiteFooter() {
  const appBaseHref = resolveAppBaseHref();

  return (
    <footer className="site-footer" role="contentinfo">
      <nav className="site-footer-links" aria-label="Site links">
        <a href={`${appBaseHref}settings/`}>Settings</a>
        <a href={`${appBaseHref}privacy/`}>Privacy</a>
        <a href={`${appBaseHref}methodology/`}>Methodology</a>
        <a href={`${appBaseHref}acceptance/`}>Acceptance criteria</a>
        <a href={`${appBaseHref}about/`}>About</a>
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
