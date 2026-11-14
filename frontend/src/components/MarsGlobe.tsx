"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

const TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

// Mars locations
const LOCATIONS = [
  {
    name: "Jezero Crater",
    longitude: 77.58,
    latitude: 18.38,
    description: "Perseverance rover landing site",
  },
  {
    name: "Gale Crater",
    longitude: 137.8,
    latitude: -5.4,
    description: "Curiosity rover exploration site",
  },
  {
    name: "Olympus Mons",
    longitude: 226.2,
    latitude: 18.65,
    description: "Largest known volcano in the Solar System",
  },
];

type MarsLocation = (typeof LOCATIONS)[number];

export default function MarsGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Initialize Cesium
  useEffect(() => {
    let cesiumViewer: Cesium.Viewer | undefined;
    let cancelled = false;

    async function initializeMars() {
      try {
        if (!TOKEN) {
          throw new Error("Cesium ion token is missing.");
        }

        window.CESIUM_BASE_URL = "/cesium/";

        Cesium.Ion.defaultAccessToken = TOKEN;
        Cesium.Ellipsoid.default = Cesium.Ellipsoid.MARS;

        if (!containerRef.current || cancelled) return;

        // Create viewer
        cesiumViewer = new Cesium.Viewer(containerRef.current, {
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

        setViewer(cesiumViewer);

        // Load Mars 3D Tiles
        const mars = await Cesium.Cesium3DTileset.fromIonAssetId(3644333);

        if (cancelled) {
          mars.destroy();
          return;
        }

        cesiumViewer.scene.primitives.add(mars);

        // Add location markers
        LOCATIONS.forEach((location) => {
          cesiumViewer!.entities.add({
            name: location.name,

            position: Cesium.Cartesian3.fromDegrees(
              location.longitude,
              location.latitude,
              2000,
              Cesium.Ellipsoid.MARS,
            ),

            point: {
              pixelSize: 10,
              color: Cesium.Color.ORANGE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },

            label: {
              text: location.name,
              font: "14px sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -20),
            },
          });
        });

        // Initial camera position
        await cesiumViewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            77.58,
            18.38,
            4000000,
            Cesium.Ellipsoid.MARS,
          ),
          duration: 2,
        });
      } catch (err) {
        console.error("Mars loading error:", err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Mars.");
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
      cesiumViewer?.destroy();
      setViewer(null);
    };
  }, []);

  // Camera navigation functions

  function zoomIn() {
    viewer?.camera.zoomIn(200000);
  }

  function zoomOut() {
    viewer?.camera.zoomOut(200000);
  }

  function rotateLeft() {
    viewer?.camera.rotateLeft(0.2);
  }

  function rotateRight() {
    viewer?.camera.rotateRight(0.2);
  }

  function tiltUp() {
    viewer?.camera.rotateUp(0.1);
  }

  function tiltDown() {
    viewer?.camera.rotateDown(0.1);
  }

  function resetCamera() {
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        77.58,
        18.38,
        4000000,
        Cesium.Ellipsoid.MARS,
      ),
      duration: 2,
    });

    setSelectedLocation(null);
  }

  // Navigate to a specific Mars location

  function flyToLocation(location: MarsLocation) {
    if (!viewer) return;

    setSelectedLocation(location.name);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        location.longitude,
        location.latitude,
        150000,
        Cesium.Ellipsoid.MARS,
      ),
      duration: 2,
    });
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Cesium viewer */}

      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading */}

      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <div className="text-2xl font-bold">Loading Mars...</div>
            <p className="mt-2 text-sm text-gray-400">
              Preparing planetary terrain
            </p>
          </div>
        </div>
      )}

      {/* Error */}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 text-red-400">
          <div className="max-w-md p-6 text-center">
            <h2 className="text-xl font-bold">Failed to load Mars</h2>
            <p className="mt-3 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}

      <div className="absolute top-5 left-5 z-10 text-white">
        <h1 className="text-2xl font-bold tracking-wider">MARS EXPLORER</h1>

        <p className="text-xs text-gray-300 mt-1">
          INTERPLANETARY SURVIVAL GUIDE
        </p>
      </div>

      {/* Location sidebar */}

      <div className="absolute top-24 left-5 z-10 w-64 rounded-xl border border-white/10 bg-black/70 p-4 text-white backdrop-blur-md">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">
          Explore locations
        </h2>

        <div className="space-y-2">
          {LOCATIONS.map((location) => (
            <button
              key={location.name}
              onClick={() => flyToLocation(location)}
              disabled={!viewer}
              className={`w-full rounded-lg p-3 text-left transition ${
                selectedLocation === location.name
                  ? "bg-orange-500/30 border border-orange-400"
                  : "bg-white/5 hover:bg-white/10 border border-transparent"
              }`}
            >
              <div className="font-medium text-sm">{location.name}</div>

              <div className="mt-1 text-xs text-gray-400">
                {location.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation controls */}

      <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-2">
        {/* Zoom */}

        <button
          onClick={zoomIn}
          disabled={!viewer}
          title="Zoom in"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          +
        </button>

        <button
          onClick={zoomOut}
          disabled={!viewer}
          title="Zoom out"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          −
        </button>

        {/* Rotation */}

        <button
          onClick={rotateLeft}
          disabled={!viewer}
          title="Rotate left"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          ↶
        </button>

        <button
          onClick={rotateRight}
          disabled={!viewer}
          title="Rotate right"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          ↷
        </button>

        {/* Tilt */}

        <button
          onClick={tiltUp}
          disabled={!viewer}
          title="Tilt up"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          ↑
        </button>

        <button
          onClick={tiltDown}
          disabled={!viewer}
          title="Tilt down"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          ↓
        </button>

        {/* Reset */}

        <button
          onClick={resetCamera}
          disabled={!viewer}
          title="Reset camera"
          className="h-11 w-11 rounded-lg bg-black/70 text-white text-xl backdrop-blur hover:bg-orange-500 disabled:opacity-40"
        >
          ⌂
        </button>
      </div>

      {/* Selected location information */}

      {selectedLocation && (
        <div className="absolute bottom-8 left-5 z-10 rounded-lg border border-white/10 bg-black/70 p-4 text-white backdrop-blur-md">
          <p className="text-xs text-gray-400">CURRENT LOCATION</p>

          <h2 className="mt-1 font-semibold">{selectedLocation}</h2>
        </div>
      )}
    </div>
  );
}
