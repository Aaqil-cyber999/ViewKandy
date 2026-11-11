import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AddToTripButton,
  SaveButton,
} from "@/components/places/save-button";
import { ToastProvider } from "@/components/providers/toast-provider";
import { useSavedStore } from "@/lib/store/use-saved-store";

function renderWithToasts(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  useSavedStore.setState({ favorites: [], itineraries: [], pins: [] });
});

describe("SaveButton", () => {
  it("saves a place and announces it", async () => {
    renderWithToasts(<SaveButton slug="temple" name="Temple" />);

    const save = await screen.findByRole("button", { name: "Save Temple" });
    expect(save).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(save);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove Temple from saved" }),
      ).toHaveAttribute("aria-pressed", "true");
    });
    expect(useSavedStore.getState().favorites).toContain("temple");
    expect(await screen.findByText("Saved Temple on this device.")).toBeInTheDocument();
  });

  it("removes a saved place again", async () => {
    useSavedStore.setState({ favorites: ["temple"] });
    renderWithToasts(<SaveButton slug="temple" name="Temple" />);

    const saved = await screen.findByRole("button", {
      name: "Remove Temple from saved",
    });
    fireEvent.click(saved);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Temple" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
    expect(useSavedStore.getState().favorites).not.toContain("temple");
    expect(
      await screen.findByText("Removed Temple from saved places."),
    ).toBeInTheDocument();
  });

  it("renders the full variant with text labels", async () => {
    renderWithToasts(<SaveButton slug="lake" name="Kandy Lake" variant="full" />);

    const save = await screen.findByRole("button", { name: "Save place" });
    fireEvent.click(save);

    expect(await screen.findByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("AddToTripButton", () => {
  it("adds and removes a place from the trip shortlist", async () => {
    renderWithToasts(<AddToTripButton slug="museum" name="Museum" />);

    const add = await screen.findByRole("button", { name: "Add to trip" });
    fireEvent.click(add);

    expect(
      await screen.findByRole("button", { name: "In shortlist" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(useSavedStore.getState().pins).toContain("museum");
    expect(
      await screen.findByText(/Added Museum to your trip shortlist/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "In shortlist" }));

    expect(await screen.findByRole("button", { name: "Add to trip" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(useSavedStore.getState().pins).not.toContain("museum");
  });
});
