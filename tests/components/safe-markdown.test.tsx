import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafeMarkdown } from "@/components/assistant/safe-markdown";
import { Badge, VerificationBadge } from "@/components/ui/badge";

describe("SafeMarkdown", () => {
  const text = [
    "# Morning plan",
    "",
    "Some **bold** text, _italic_ text and `inline code`.",
    "",
    "- first bullet",
    "- second bullet",
    "",
    "1. first step",
    "2. second step",
    "",
    "[Open map](https://example.com/map)",
    "",
    "---",
    "",
    "<img src=x onerror=alert(1)>",
  ].join("\n");

  it("renders headings, emphasis, code and links safely", () => {
    const { container } = render(<SafeMarkdown text={text} />);

    expect(screen.getByText("Morning plan")).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("inline code").tagName).toBe("CODE");

    const link = screen.getByRole("link", { name: "Open map" });
    expect(link).toHaveAttribute("href", "https://example.com/map");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");

    expect(screen.getByText("first bullet")).toBeInTheDocument();
    expect(screen.getByText("second step")).toBeInTheDocument();
    expect(container.querySelector("hr")).not.toBeNull();
  });

  it("never injects raw HTML from assistant output", () => {
    const { container } = render(<SafeMarkdown text={text} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });

  it("renders plain paragraphs when there is no markup", () => {
    render(<SafeMarkdown text="Just a sentence." />);
    expect(screen.getByText("Just a sentence.")).toBeInTheDocument();
  });
});

describe("VerificationBadge", () => {
  it("labels verified records", () => {
    render(<VerificationBadge status="verified" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("labels partly verified records", () => {
    render(<VerificationBadge status="partially_verified" />);
    expect(screen.getByText("Partly verified")).toBeInTheDocument();
  });

  it("defaults unknown states to unverified", () => {
    render(<VerificationBadge status="something-else" />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge variant="mint">Open</Badge>);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });
});
