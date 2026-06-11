import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./site-footer";

describe("site-footer", () => {
  it("links to consolidated footer pages", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "./settings/"
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "./privacy/"
    );
    expect(screen.getByRole("link", { name: "Methodology" })).toHaveAttribute(
      "href",
      "./methodology/"
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "./about/"
    );
  });
});
