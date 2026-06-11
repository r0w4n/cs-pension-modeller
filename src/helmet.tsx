import { Children, isValidElement, useEffect, type ReactNode } from "react";

type HelmetProps = {
  children: ReactNode;
};

type HelmetMetaElementProps = {
  name?: unknown;
  content?: unknown;
};

function getTextContent(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return getTextContent(child.props.children);
      }

      return "";
    })
    .join("")
    .trim();
}

function getHelmetValues(children: ReactNode) {
  let title: string | undefined;
  let description: string | undefined;

  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return;
    }

    if (child.type === "title") {
      const textContent = getTextContent(child.props.children);
      if (textContent) {
        title = textContent;
      }
      return;
    }

    if (child.type === "meta") {
      const props = child.props as HelmetMetaElementProps;
      if (props.name === "description" && typeof props.content === "string") {
        description = props.content;
      }
    }
  });

  return { title, description };
}

export function Helmet({ children }: HelmetProps) {
  const { title, description } = getHelmetValues(children);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousTitle = document.title;
    const descriptionMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const hadDescriptionMeta = descriptionMeta !== null;
    const previousDescription = descriptionMeta
      ? descriptionMeta.getAttribute("content")
      : null;

    if (title) {
      document.title = title;
    }

    if (description) {
      const meta =
        descriptionMeta ??
        document.head.appendChild(document.createElement("meta"));

      if (!descriptionMeta) {
        meta.setAttribute("name", "description");
      }

      meta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;

      if (!description) {
        return;
      }

      const currentDescriptionMeta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );

      if (!currentDescriptionMeta) {
        return;
      }

      if (hadDescriptionMeta) {
        if (previousDescription === null) {
          currentDescriptionMeta.removeAttribute("content");
        } else {
          currentDescriptionMeta.setAttribute("content", previousDescription);
        }
      } else {
        currentDescriptionMeta.remove();
      }
    };
  }, [description, title]);

  return null;
}
