"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

const MARS_LOCATIONS = [
  {
    name: "Jezero Crater",
    description: "Perseverance landing site",
    longitude: 77.58,
    latitude: 18.38,
  },
  {
    name: "Gale Crater",
    description: "Curiosity rover landing site",
    longitude: 137.8,
    latitude: -5.4,
  },
  {
    name: "Olympus Mons",
    description: "Largest volcano in the Solar System",
    longitude: 226.2,
    latitude: 18.65,
  },
];

type MarsLocation = (typeof MARS_LOCATIONS)[number];

export default function MarsGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MarsLocation | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    let viewer: Cesium.Viewer | undefined;
    let tileset: Cesium.Cesium3DTileset | undefined;

    async function initializeMars() {
      try {
        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

        if (!token) {
          throw new Error(
            "Cesium ion token is missing. Check your .env.local file.",
          );
        }

        if (!containerRef.current) return;

        window.CESIUM_BASE_URL = "/cesium/";
        Cesium.Ion.defaultAccessToken = token;

        viewer = new Cesium.Viewer(containerRef.current, {
          globe: false,
          animation: false,
          timeline: false,
          // sceneModePicker: false,
          // baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          baseLayer: false,
          infoBox: false,
          // selectionIndicator: false,
        });

        viewerRef.current = viewer;

        viewer.scene.backgroundColor =
          Cesium.Color.fromCssColorString("#080b16");

        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

        // Load Mars terrain/3D tiles from Cesium ion.
        // Verify that this asset ID is available to your ion account.
        tileset = await Cesium.Cesium3DTileset.fromIonAssetId(3644333);

        if (cancelled || viewer.isDestroyed()) {
          tileset.destroy();
          return;
        }

        viewer.scene.primitives.add(tileset);

        // Add location markers.
        MARS_LOCATIONS.forEach((location) => {
          viewer!.entities.add({
            name: location.name,
            position: Cesium.Cartesian3.fromDegrees(
              location.longitude,
              location.latitude,
              1000,
              Cesium.Ellipsoid.MARS,
            ),
            point: {
              pixelSize: 10,
              color: Cesium.Color.fromCssColorString("#ff7043"),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: location.name,
              font: "14px sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -22),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        // Initial camera position.
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            77.58,
            18.38,
            4000000,
            Cesium.Ellipsoid.MARS,
          ),
          duration: 2,
        });

        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        console.error("Mars initialization failed:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading Mars.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializeMars();

    return () => {
      cancelled = true;

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }

      viewerRef.current = null;
    };
  }, []);

  // Camera controls
  const zoomIn = () => {
    viewerRef.current?.camera.zoomIn(200000);
  };

  const zoomOut = () => {
    viewerRef.current?.camera.zoomOut(200000);
  };

  const rotateLeft = () => {
    viewerRef.current?.camera.rotateLeft(0.2);
  };

  const rotateRight = () => {
    viewerRef.current?.camera.rotateRight(0.2);
  };

  const rotateUp = () => {
    viewerRef.current?.camera.rotateUp(0.1);
  };

  const rotateDown = () => {
    viewerRef.current?.camera.rotateDown(0.1);
  };

  const resetCamera = () => {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        77.58,
        18.38,
        4000000,
        Cesium.Ellipsoid.MARS,
      ),
      duration: 2,
    });
  };

  const flyToLocation = (location: MarsLocation) => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    setSelectedLocation(location);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        location.longitude,
        location.latitude,
        150000,
        Cesium.Ellipsoid.MARS,
      ),
      duration: 2,
    });

    setMenuOpen(false);
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#080b16] text-white">
      {/* Cesium viewer: keep mounted even while loading */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top-left header */}
      <header className="absolute left-5 top-5 z-10">
        <h1 className="text-2xl font-bold tracking-tight">
          MARS<span className="text-orange-500">.</span>
        </h1>
        <p className="text-xs tracking-widest text-gray-400">
          INTERPLANETARY SURVIVAL GUIDE
        </p>
      </header>

      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        className="absolute right-5 top-5 z-30 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#151a2a]/90 backdrop-blur-md transition hover:bg-orange-500"
      >
        <div className="flex w-5 flex-col gap-1.5">
          <span
            className={`h-0.5 w-full bg-white transition-all ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-full bg-white transition-all ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-full bg-white transition-all ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </div>
      </button>

      {/* Menu backdrop */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 z-20 bg-black/40"
        />
      )}

      {/* Hamburger drawer */}
      <aside
        className={`absolute right-0 top-0 z-20 h-full w-[320px] max-w-[85vw] border-l border-white/10 bg-[#101525]/95 p-6 pt-24 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto">
          {/* Camera navigation */}
          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gray-400">
              CAMERA CONTROLS
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <div />
              <ControlButton onClick={rotateUp} disabled={loading}>
                ↑
              </ControlButton>
              <div />

              <ControlButton onClick={rotateLeft} disabled={loading}>
                ←
              </ControlButton>
              <ControlButton onClick={resetCamera} disabled={loading}>
                <span className="text-lg">⌂</span>
              </ControlButton>
              <ControlButton onClick={rotateRight} disabled={loading}>
                →
              </ControlButton>

              <div />
              <ControlButton onClick={rotateDown} disabled={loading}>
                ↓
              </ControlButton>
              <div />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ControlButton onClick={zoomIn} disabled={loading}>
                + Zoom in
              </ControlButton>
              <ControlButton onClick={zoomOut} disabled={loading}>
                − Zoom out
              </ControlButton>
            </div>
          </section>

          {/* Locations */}
          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gray-400">
              EXPLORE MARS
            </h2>

            <div className="space-y-2">
              {MARS_LOCATIONS.map((location) => (
                <button
                  key={location.name}
                  type="button"
                  onClick={() => flyToLocation(location)}
                  disabled={loading}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedLocation?.name === location.name
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-white/10 bg-white/5 hover:border-orange-500/50 hover:bg-white/10"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="font-medium">{location.name}</div>
                  <p className="mt-1 text-xs text-gray-400">
                    {location.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-auto border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500">MARS EXPLORATION SYSTEM</p>
            <p className="mt-1 text-xs text-gray-600">
              Navigate the Martian surface.
            </p>
          </div>
        </div>
      </aside>

      {/* Selected location information */}
      {selectedLocation && (
        <div className="absolute bottom-6 left-5 z-10 max-w-xs rounded-xl border border-white/10 bg-[#101525]/90 p-4 backdrop-blur-md">
          <p className="text-xs font-semibold tracking-widest text-orange-400">
            SELECTED LOCATION
          </p>
          <h2 className="mt-2 text-lg font-bold">{selectedLocation.name}</h2>
          <p className="mt-1 text-sm text-gray-400">
            {selectedLocation.description}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {selectedLocation.latitude.toFixed(2)}° N/S,{" "}
            {selectedLocation.longitude.toFixed(2)}° E/W
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#080b16]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
            <p className="text-sm tracking-widest text-gray-300">
              INITIALIZING MARS...
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-x-5 bottom-5 z-50 mx-auto max-w-lg rounded-xl border border-red-500/30 bg-[#25151b] p-4">
          <p className="font-semibold text-red-400">Unable to load Mars</p>
          <p className="mt-2 break-words text-sm text-gray-300">{error}</p>
        </div>
      )}
    </main>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm transition hover:border-orange-500 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
