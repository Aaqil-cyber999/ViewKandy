"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import { getCategory } from "@/lib/data";
import type { Place } from "@/types/place";
import type { RoutePoint } from "@/lib/maps/routes";

interface FallbackMapProps {
  places: Place[];
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
  route?: RoutePoint[] | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  interactive?: boolean;
  onError?: (message: string) => void;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function injectCss() {
  for (const [id, href] of [
    ["leaflet-css", "/vendor/leaflet.css"],
    ["markercluster-css", "/vendor/markercluster.css"],
    ["markercluster-default-css", "/vendor/markercluster-default.css"],
  ] as const) {
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

function markerHtml(place: Place, selected: boolean): string {
  const category = getCategory(place.category);
  return `<div class="kv-marker${selected ? " kv-marker-selected" : ""}" style="--marker-color:${category.color}">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="7"></circle>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"></circle>
    </svg>
  </div>`;
}

export function FallbackMap({
  places,
  selectedSlug,
  onSelect,
  route,
  center = { lat: 7.2906, lng: 80.6337 },
  zoom = 14,
  className = "h-full w-full",
  interactive = true,
  onError,
}: FallbackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeRef = useRef<Leaflet.Polyline | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function init() {
      try {
        injectCss();
        const L = (await import("leaflet")).default;
        await import("leaflet.markercluster");
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;

        const map = L.map(containerRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: true,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          touchZoom: interactive,
          keyboard: interactive,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        if (interactive) {
          L.control.zoom({ position: "bottomright" }).addTo(map);
        }

        const clusterFactory = (
          L as unknown as {
            markerClusterGroup?: (options?: Record<string, unknown>) => Leaflet.LayerGroup;
          }
        ).markerClusterGroup;
        const group: Leaflet.LayerGroup = clusterFactory
          ? clusterFactory({
              showCoverageOnHover: false,
              spiderfyOnMaxZoom: true,
              maxClusterRadius: 48,
              disableClusteringAtZoom: 16,
            })
          : L.layerGroup();
        group.addTo(map);
        layerRef.current = group;

        map.invalidateSize();
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(containerRef.current);
      } catch (error) {
        console.error("[leaflet] initialisation failed:", error);
        onError?.(
          error instanceof Error ? error.message : "2D map failed to initialise.",
        );
      }
    }

    void init();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = layerRef.current;
    if (!L || !map || !group) return;

    group.clearLayers();
    const markers: Leaflet.Marker[] = [];
    for (const place of places) {
      const icon = L.divIcon({
        className: "kv-marker-wrap",
        html: markerHtml(place, place.slug === selectedSlug),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        tooltipAnchor: [0, -16],
      });
      const marker = L.marker([place.lat, place.lng], {
        icon,
        title: place.name,
        alt: place.name,
        keyboard: true,
      });
      marker.bindTooltip(escapeHtml(place.name), {
        direction: "top",
        offset: [0, -14],
        opacity: 1,
      });
      marker.on("click", () => onSelectRef.current?.(place.slug));
      markers.push(marker);
      group.addLayer(marker);
    }

    if (markers.length > 0 && !selectedSlug) {
      const bounds = L.latLngBounds(markers.map((m) => m.getLatLng()));
      map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, selectedSlug]);

  // Fly to selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSlug) return;
    const place = places.find((p) => p.slug === selectedSlug);
    if (!place) return;
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 15), { duration: 1.1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  // Route line
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }
    if (route && route.length >= 2) {
      routeRef.current = L.polyline(
        route.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: "#38bdf8",
          weight: 4,
          opacity: 0.95,
          dashArray: "10 8",
          lineCap: "round",
        },
      ).addTo(map);
      map.fitBounds(routeRef.current.getBounds().pad(0.2), { maxZoom: 15 });
    }
  }, [route]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Map of Kandy with place markers"
    />
  );
}
