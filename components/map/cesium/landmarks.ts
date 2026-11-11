import type { CesiumNamespace } from "@/lib/maps/cesium-loader";
import { getCategory } from "@/lib/data";
import type { Place } from "@/types/place";

export type LandmarkKind =
  | "temple"
  | "statue"
  | "tower"
  | "palace"
  | "museum"
  | "station"
  | "generic";

/** Recognisable, hand-authored massing for the city's key landmarks. */
export const LANDMARK_KINDS: Record<string, LandmarkKind> = {
  "temple-of-the-sacred-tooth-relic": "temple",
  "royal-palace-kandy": "palace",
  "bahirawakanda-buddha-statue": "statue",
  "kandy-clock-tower": "tower",
  "national-museum-kandy": "museum",
  "kandy-railway-station": "station",
  "queens-hotel-kandy": "palace",
  "kandy-city-centre": "museum",
};

export interface LandmarkOptions {
  labels: boolean;
  baseHeights?: Map<string, number>;
}

const GOLD = "#e7b84b";
const CREAM = "#ece4d3";
const ROOF = "#b4532f";

export function buildLandmarkEntities(
  Cesium: CesiumNamespace,
  viewer: InstanceType<CesiumNamespace["Viewer"]>,
  places: Place[],
  options: LandmarkOptions,
) {
  const created: InstanceType<CesiumNamespace["Entity"]>[] = [];

  for (const place of places) {
    const kind = LANDMARK_KINDS[place.slug];
    if (!kind) continue;
    const base = options.baseHeights?.get(place.slug) ?? 0;
    const lng = place.lng;
    const lat = place.lat;
    const at = (height: number) =>
      Cesium.Cartesian3.fromDegrees(lng, lat, base + height);

    const color = (css: string) => Cesium.Color.fromCssColorString(css);

    const add = (entity: Record<string, unknown>) => {
      created.push(
        viewer.entities.add({
          ...entity,
          properties: { slug: place.slug, kind: "landmark" },
        } as never),
      );
    };

    if (kind === "temple") {
      add({
        position: at(7),
        box: {
          dimensions: new Cesium.Cartesian3(78, 62, 14),
          material: color(CREAM),
          outline: true,
          outlineColor: color("#8a7b60"),
        },
      });
      add({
        position: at(14 + 14),
        cylinder: {
          length: 28,
          topRadius: 0,
          bottomRadius: 48,
          slices: 4,
          material: color(GOLD),
          outline: true,
          outlineColor: color("#a37c1f"),
        },
      });
      add({
        position: at(42 + 9),
        cylinder: {
          length: 18,
          topRadius: 0.4,
          bottomRadius: 5,
          slices: 4,
          material: color(GOLD),
        },
      });
      add({
        position: at(3),
        box: {
          dimensions: new Cesium.Cartesian3(96, 12, 6),
          material: color("#d8d0bd"),
        },
      });
    }

    if (kind === "palace") {
      add({
        position: at(6),
        box: {
          dimensions: new Cesium.Cartesian3(104, 34, 12),
          material: color(CREAM),
          outline: true,
          outlineColor: color("#8a7b60"),
        },
      });
      add({
        position: at(12 + 5),
        cylinder: {
          length: 10,
          topRadius: 0,
          bottomRadius: 30,
          slices: 4,
          material: color(ROOF),
        },
      });
    }

    if (kind === "museum") {
      add({
        position: at(5),
        box: {
          dimensions: new Cesium.Cartesian3(52, 34, 10),
          material: color("#d6cbb8"),
          outline: true,
          outlineColor: color("#7d725f"),
        },
      });
      add({
        position: at(10 + 4),
        cylinder: {
          length: 8,
          topRadius: 0,
          bottomRadius: 22,
          slices: 4,
          material: color(ROOF),
        },
      });
    }

    if (kind === "station") {
      add({
        position: at(5),
        box: {
          dimensions: new Cesium.Cartesian3(120, 24, 10),
          material: color("#cbbfa8"),
          outline: true,
          outlineColor: color("#6f6656"),
        },
      });
      add({
        position: at(10 + 3),
        box: {
          dimensions: new Cesium.Cartesian3(126, 30, 6),
          material: color(ROOF),
        },
      });
    }

    if (kind === "tower") {
      add({
        position: at(19),
        box: {
          dimensions: new Cesium.Cartesian3(10, 10, 38),
          material: color("#d9d2c2"),
          outline: true,
          outlineColor: color("#6f6656"),
        },
      });
      add({
        position: at(38 + 7),
        cylinder: {
          length: 14,
          topRadius: 0,
          bottomRadius: 8,
          slices: 4,
          material: color("#3f4a58"),
        },
      });
      add({
        position: at(30),
        box: {
          dimensions: new Cesium.Cartesian3(12, 12, 2),
          material: color("#f8fafc"),
        },
      });
    }

    if (kind === "statue") {
      add({
        position: at(3),
        cylinder: {
          length: 6,
          topRadius: 26,
          bottomRadius: 30,
          slices: 24,
          material: color("#cfc6b4"),
        },
      });
      add({
        position: at(6 + 17),
        cylinder: {
          length: 34,
          topRadius: 11,
          bottomRadius: 19,
          slices: 20,
          material: color("#f3efe6"),
        },
      });
      add({
        position: at(44),
        ellipsoid: {
          radii: new Cesium.Cartesian3(9, 9, 10),
          material: color("#f7f3ea"),
        },
      });
      add({
        position: at(6 + 34),
        cylinder: {
          length: 5,
          topRadius: 13,
          bottomRadius: 13,
          slices: 20,
          material: color("#e8e2d5"),
        },
      });
    }

    if (options.labels) {
      add({
        position: at(kind === "statue" ? 60 : 24),
        label: {
          text: place.name,
          font: "500 12px Inter, system-ui, sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString("#04101c"),
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4500),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("#07111f").withAlpha(0.6),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
        },
      });
    }
  }

  return created;
}

/** Approximate outline of Kandy Lake (Kiri Muhuda), used as a water surface. */
export const KANDY_LAKE_RING: Array<[number, number]> = [
  [80.6390, 7.2930],
  [80.6402, 7.2938],
  [80.6415, 7.2935],
  [80.6424, 7.2925],
  [80.6427, 7.2912],
  [80.6421, 7.29],
  [80.641, 7.2892],
  [80.6398, 7.2896],
  [80.639, 7.2906],
  [80.6387, 7.292],
];

export function addLake(
  Cesium: CesiumNamespace,
  viewer: InstanceType<CesiumNamespace["Viewer"]>,
  baseHeight = 0,
) {
  const positions = KANDY_LAKE_RING.map(([lng, lat]) =>
    Cesium.Cartesian3.fromDegrees(lng, lat, baseHeight + 0.6),
  );
  return viewer.entities.add({
    name: "Kandy Lake",
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: Cesium.Color.fromCssColorString("#1b6f9c").withAlpha(0.82),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.6),
      height: baseHeight + 0.6,
    },
    properties: { slug: "kandy-lake", kind: "water" },
  } as never);
}

export function addPlaceMarkers(
  Cesium: CesiumNamespace,
  viewer: InstanceType<CesiumNamespace["Viewer"]>,
  places: Place[],
  options: { labels: boolean; baseHeights?: Map<string, number> },
) {
  const map = new Map<string, InstanceType<CesiumNamespace["Entity"]>>();

  for (const place of places) {
    const category = getCategory(place.category);
    const base = options.baseHeights?.get(place.slug) ?? 0;
    const entity = viewer.entities.add({
      id: `marker-${place.slug}`,
      position: Cesium.Cartesian3.fromDegrees(place.lng, place.lat, base + 12),
      point: {
        pixelSize: 9,
        color: Cesium.Color.fromCssColorString(category.color),
        outlineColor: Cesium.Color.fromCssColorString("#04101c"),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.25, 9000, 0.65),
      },
      label: options.labels
        ? {
            text: place.name,
            font: "500 11px Inter, system-ui, sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString("#04101c"),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3200),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#07111f").withAlpha(0.55),
            backgroundPadding: new Cesium.Cartesian2(5, 3),
          }
        : undefined,
      properties: { slug: place.slug, kind: "place", category: place.category },
    } as never);
    map.set(place.slug, entity);
  }

  return map;
}

export function addSelectionRing(
  Cesium: CesiumNamespace,
  viewer: InstanceType<CesiumNamespace["Viewer"]>,
  place: Place,
  baseHeight = 0,
) {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(place.lng, place.lat, baseHeight + 4),
    ellipse: {
      semiMajorAxis: 110,
      semiMinorAxis: 110,
      material: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.12),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.85),
      height: baseHeight + 4,
    },
    properties: { slug: place.slug, kind: "selection" },
  } as never);
}

export interface CameraTarget {
  lat: number;
  lng: number;
  range?: number;
  pitch?: number;
  heading?: number;
  duration?: number;
}

export function flyToTarget(
  Cesium: CesiumNamespace,
  viewer: InstanceType<CesiumNamespace["Viewer"]>,
  target: CameraTarget,
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      target.lng,
      target.lat,
      target.range ?? 2200,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(target.heading ?? 0),
      pitch: Cesium.Math.toRadians(target.pitch ?? -38),
      roll: 0,
    },
    duration: target.duration ?? 2.2,
    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
  });
}
