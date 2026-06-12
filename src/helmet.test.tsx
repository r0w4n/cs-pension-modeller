import { render } from "@testing-library/react";
import { Helmet } from "./helmet";

describe("Helmet", () => {
  it("updates the document title and description and restores them on unmount", () => {
    const originalTitle = document.title;
    const descriptionMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const originalDescription =
      descriptionMeta?.getAttribute("content") ?? null;

    const { unmount } = render(
      <Helmet>
        <title>Test page</title>
        <meta
          name="description"
          content="Test page description for the browser head."
        />
      </Helmet>
    );

    expect(document.title).toBe("Test page");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Test page description for the browser head."
    );

    unmount();

    expect(document.title).toBe(originalTitle);

    const restoredDescriptionMeta = document.querySelector(
      'meta[name="description"]'
    );

    expect(restoredDescriptionMeta?.getAttribute("content") ?? null).toBe(
      originalDescription
    );
  });
});
