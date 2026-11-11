import { describe, expect, it } from "vitest";
import { streetViewUrl } from "@/lib/maps/street-view";

describe("streetViewUrl", () => {
  it("builds an official Google Maps Street View deep link", () => {
    expect(streetViewUrl({ lat: 7.2906, lng: 80.6337 })).toBe(
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=7.290600,80.633700",
    );
  });

  it("keeps six decimal places for precise coordinates", () => {
    expect(streetViewUrl({ lat: -1.23456789, lng: 2.3456789 })).toBe(
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-1.234568,2.345679",
    );
  });
});
