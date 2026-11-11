"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { CesiumNamespace } from "@/lib/maps/cesium-loader";
import { isWebGLAvailable, loadCesium } from "@/lib/maps/cesium-loader";
import type { Place } from "@/types/place";
import type { RoutePoint } from "@/lib/maps/routes";
import {
  addLake,
  addPlaceMarkers,
  addSelectionRing,
  buildLandmarkEntities,
  flyToTarget,
  type CameraTarget,
} from "./landmarks";

export interface CesiumSceneHandle {
  flyTo: (target: CameraTarget) => void;
  reset: () => void;
  setNightMode: (on: boolean) => void;
}

interface CesiumSceneProps {
  places: Place[];
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
  mode?: "hero" | "explore" | "tour";
  route?: RoutePoint[] | null;
  labels?: boolean;
  initialTarget?: CameraTarget;
  autoOrbit?: boolean;
  onReady?: () => void;
  onError?: (message: string) => void;
  onTileset?: (active: boolean) => void;
  className?: string;
}

type Viewer = InstanceType<CesiumNamespace["Viewer"]>;
type Entity = InstanceType<CesiumNamespace["Entity"]>;

const DEFAULT_TARGET: CameraTarget = {
  lat: 7.2906,
  lng: 80.6337,
  range: 2400,
  pitch: -38,
};

export const CesiumScene = forwardRef<CesiumSceneHandle, CesiumSceneProps>(
  function CesiumScene(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const cesiumRef = useRef<CesiumNamespace | null>(null);
    const markerEntities = useRef<Map<string, Entity>>(new Map());
    const landmarkEntities = useRef<Entity[]>([]);
    const lakeEntity = useRef<Entity | null>(null);
    const selectionEntity = useRef<Entity | null>(null);
    const routeEntity = useRef<Entity | null>(null);
    const baseHeights = useRef<Map<string, number>>(new Map());
    const [ready, setReady] = useState(false);
    const [tilesetActive, setTilesetActive] = useState(false);
    const orbitRef = useRef(true);

    const propsRef = useRef(props);
    propsRef.current = props;

    useImperativeHandle(ref, () => ({
      flyTo: (target) => {
        const Cesium = cesiumRef.current;
        const viewer = viewerRef.current;
        if (!Cesium || !viewer) return;
        flyToTarget(Cesium, viewer, target);
      },
      reset: () => {
        const Cesium = cesiumRef.current;
        const viewer = viewerRef.current;
        if (!Cesium || !viewer) return;
        flyToTarget(Cesium, viewer, propsRef.current.initialTarget ?? DEFAULT_TARGET);
      },
      setNightMode: (on) => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const layer = viewer.imageryLayers.get(0);
        if (layer) {
          layer.brightness = on ? 0.55 : 1;
          layer.contrast = on ? 1.15 : 1;
          layer.saturation = on ? 0.8 : 1;
        }
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = !on;
        }
      },
    }));

    // Initialise once.
    useEffect(() => {
      let cancelled = false;
      let viewer: Viewer | null = null;
      let clickHandler: InstanceType<CesiumNamespace["ScreenSpaceEventHandler"]> | null = null;
      let resizeObserver: ResizeObserver | null = null;

      async function init() {
        try {
          if (!isWebGLAvailable()) {
            throw new Error(
              "WebGL is not available in this browser. Use the 2D map instead.",
            );
          }
          const Cesium = await loadCesium();
          if (cancelled || !containerRef.current) return;
          cesiumRef.current = Cesium;

          const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
          if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

          viewer = new Cesium.Viewer(containerRef.current, {
            baseLayer: new Cesium.ImageryLayer(
              new Cesium.UrlTemplateImageryProvider({
                url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                credit: new Cesium.Credit(
                  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> © CARTO',
                ),
                maximumLevel: 19,
              }),
            ),
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            infoBox: false,
            selectionIndicator: false,
            scene3DOnly: true,
            shouldAnimate: true,
          });

          viewerRef.current = viewer;
          viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#040b14");
          viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#07111f");
          viewer.scene.globe.showGroundAtmosphere = true;
          viewer.scene.fog.enabled = true;
          viewer.scene.fog.density = 0.00018;
          viewer.scene.screenSpaceCameraController.minimumZoomDistance = 90;
          viewer.scene.screenSpaceCameraController.maximumZoomDistance = 26000;
          viewer.scene.screenSpaceCameraController.inertiaSpin = 0.82;
          viewer.scene.postProcessStages.fxaa.enabled = true;

          if (ionToken) {
            try {
              const terrain = await Cesium.createWorldTerrainAsync();
              if (cancelled) return;
              viewer.terrainProvider = terrain;
              const cartographics = propsRef.current.places.map((p) =>
                Cesium.Cartographic.fromDegrees(p.lng, p.lat),
              );
              const sampled = await Cesium.sampleTerrainMostDetailed(terrain, cartographics);
              const heights = new Map<string, number>();
              propsRef.current.places.forEach((place, index) => {
                heights.set(place.slug, sampled[index]?.height ?? 0);
              });
              baseHeights.current = heights;
            } catch (error) {
              console.warn("[cesium] World Terrain unavailable:", error);
            }
          }

          const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (googleKey) {
            try {
              const tileset = await Cesium.createGooglePhotorealistic3DTileset({
                key: googleKey,
                onlyUsingWithGoogleGeocoder: true,
              });
              if (cancelled) return;
              viewer.scene.primitives.add(tileset);
              viewer.scene.globe.show = false;
              setTilesetActive(true);
              propsRef.current.onTileset?.(true);
            } catch (error) {
              console.warn(
                "[cesium] Google Photorealistic 3D Tiles unavailable for this area/key; using globe + custom landmarks.",
                error,
              );
              propsRef.current.onTileset?.(false);
            }
          }

          const target = propsRef.current.initialTarget ?? DEFAULT_TARGET;
          const hero = propsRef.current.mode === "hero";
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
              target.lng,
              target.lat,
              hero ? Math.max(target.range ?? 2400, 9000) : (target.range ?? 2400) * 1.6,
            ),
            orientation: {
              heading: Cesium.Math.toRadians(target.heading ?? 0),
              pitch: Cesium.Math.toRadians(hero ? -62 : (target.pitch ?? -38) - 12),
              roll: 0,
            },
          });

          if (hero) {
            window.setTimeout(() => {
              if (!cancelled) flyToTarget(Cesium, viewer as Viewer, target);
            }, 900);
          }

          clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
          clickHandler.setInputAction(
            (movement: { position: InstanceType<CesiumNamespace["Cartesian2"]> }) => {
              if (!viewer) return;
              const picked = viewer.scene.pick(movement.position) as
                | { id?: Entity }
                | undefined;
              const entity = picked?.id;
              const slug = entity?.properties?.slug?.getValue?.(Cesium.JulianDate.now());
              if (typeof slug === "string") {
                propsRef.current.onSelect?.(slug);
              }
            },
            Cesium.ScreenSpaceEventType.LEFT_CLICK,
          );

          const stopOrbit = () => {
            orbitRef.current = false;
          };
          viewer.scene.canvas.addEventListener("pointerdown", stopOrbit, { passive: true });
          viewer.scene.canvas.addEventListener("wheel", stopOrbit, { passive: true });

          viewer.clock.onTick.addEventListener(() => {
            if (!viewer) return;
            const isHero = propsRef.current.mode === "hero";
            if (isHero && orbitRef.current && propsRef.current.autoOrbit !== false) {
              viewer.camera.rotateRight(0.00008);
            }
          });

          resizeObserver = new ResizeObserver(() => {
            viewer?.resize();
          });
          resizeObserver.observe(containerRef.current);

          setReady(true);
          propsRef.current.onReady?.();
        } catch (error) {
          console.error("[cesium] initialisation failed:", error);
          propsRef.current.onError?.(
            error instanceof Error ? error.message : "3D scene failed to initialise.",
          );
        }
      }

      void init();

      return () => {
        cancelled = true;
        resizeObserver?.disconnect();
        clickHandler?.destroy();
        if (viewer && !viewer.isDestroyed()) viewer.destroy();
        viewerRef.current = null;
        cesiumRef.current = null;
        markerEntities.current.clear();
        landmarkEntities.current = [];
        lakeEntity.current = null;
        selectionEntity.current = null;
        routeEntity.current = null;
      };
    }, []);

    // Markers, lake and landmark massing.
    useEffect(() => {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!ready || !Cesium || !viewer) return;

      for (const entity of markerEntities.current.values()) viewer.entities.remove(entity);
      markerEntities.current.clear();
      for (const entity of landmarkEntities.current) viewer.entities.remove(entity);
      landmarkEntities.current = [];
      if (lakeEntity.current) viewer.entities.remove(lakeEntity.current);
      lakeEntity.current = null;

      const showLabels = props.labels ?? true;
      const showMassing = !tilesetActive;

      markerEntities.current = addPlaceMarkers(Cesium, viewer, props.places, {
        labels: showLabels,
        baseHeights: baseHeights.current,
      });

      if (showMassing) {
        lakeEntity.current = addLake(Cesium, viewer, baseHeights.current.get("kandy-lake") ?? 0);
        landmarkEntities.current = buildLandmarkEntities(Cesium, viewer, props.places, {
          labels: false,
          baseHeights: baseHeights.current,
        });
      }
    }, [ready, props.places, props.labels, tilesetActive]);

    // Selection ring.
    useEffect(() => {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!ready || !Cesium || !viewer) return;
      if (selectionEntity.current) {
        viewer.entities.remove(selectionEntity.current);
        selectionEntity.current = null;
      }
      const selected = props.places.find((p) => p.slug === props.selectedSlug);
      if (selected) {
        selectionEntity.current = addSelectionRing(
          Cesium,
          viewer,
          selected,
          baseHeights.current.get(selected.slug) ?? 0,
        );
      }
    }, [ready, props.selectedSlug, props.places]);

    // Route polyline.
    useEffect(() => {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!ready || !Cesium || !viewer) return;
      if (routeEntity.current) {
        viewer.entities.remove(routeEntity.current);
        routeEntity.current = null;
      }
      if (props.route && props.route.length >= 2) {
        routeEntity.current = viewer.entities.add({
          polyline: {
            positions: props.route.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 18)),
            width: 5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#38bdf8"),
              dashLength: 18,
            }),
            clampToGround: false,
            arcType: Cesium.ArcType.GEODESIC,
          },
        } as never);
      }
    }, [ready, props.route]);

    return (
      <div className={props.className ?? "h-full w-full"}>
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label="Interactive 3D map of Kandy"
          role="application"
        />
      </div>
    );
  },
);
