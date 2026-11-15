"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

const MARS_RADIUS = 3_396_190;

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
  {
    name: "Valles Marineris",
    description: "One of the largest canyon systems in the Solar System",
    longitude: 301.4123,
    latitude: -14.0059,
  },
  {
    name: "Hellas Planitia",
    description: "One of the largest impact basins on Mars",
    longitude: 70.5025,
    latitude: -42.4301,
  },
  {
    name: "Isidis Planitia",
    description: "Ancient impact basin",
    longitude: 88.0,
    latitude: 12.0,
  },
  {
    name: "Utopia Planitia",
    description: "Vast northern impact basin",
    longitude: 110.0,
    latitude: 45.0,
  },
  {
    name: "Elysium Planitia",
    description: "NASA InSight lander region",
    longitude: 154.7372,
    latitude: 2.979,
  },
  {
    name: "Arsia Mons",
    description: "Large shield volcano",
    longitude: 239.91,
    latitude: -8.26,
  },
  {
    name: "Pavonis Mons",
    description: "Equatorial shield volcano",
    longitude: 247.0,
    latitude: 0.0,
  },
  {
    name: "Ascraeus Mons",
    description: "Large shield volcano",
    longitude: 255.92,
    latitude: 11.92,
  },
  {
    name: "Alba Mons",
    description: "Vast volcanic formation",
    longitude: 249.29,
    latitude: 41.08,
  },
  {
    name: "Argyre Planitia",
    description: "Large southern impact basin",
    longitude: 320.0,
    latitude: -50.0,
  },
  {
    name: "Apollinaris Mons",
    description: "Ancient volcanic mountain",
    longitude: 174.793,
    latitude: -9.1712,
  },
  {
    name: "Elysium Mons",
    description: "Large shield volcano",
    longitude: 147.2138,
    latitude: 25.0232,
  },
];


type MarsLocation = (typeof MARS_LOCATIONS)[number];

// ==========================================
// ROTATE A VECTOR AROUND AN AXIS
// ==========================================

function rotateVector(
  vector: Cesium.Cartesian3,
  axis: Cesium.Cartesian3,
  angle: number,
): Cesium.Cartesian3 {
  const normalizedAxis = Cesium.Cartesian3.normalize(
    axis,
    new Cesium.Cartesian3(),
  );

  const quaternion = Cesium.Quaternion.fromAxisAngle(normalizedAxis, angle);

  const matrix = Cesium.Matrix3.fromQuaternion(quaternion);

  return Cesium.Matrix3.multiplyByVector(
    matrix,
    vector,
    new Cesium.Cartesian3(),
  );
}

// ==========================================
// MARS GLOBE COMPONENT
// ==========================================

export default function MarsGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [achievement, setAchievement] = useState(false);

  // Show achievement when Mars finishes loading
  useEffect(() => {
    if (!loading && !error) {
      setAchievement(true);
      setTimeout(() => setAchievement(false), 4000);
    }
  }, [loading, error]);

  const [selectedLocation, setSelectedLocation] = useState<MarsLocation | null>(
    null,
  );

  // ==========================================
  // INITIALIZE CESIUM
  // ==========================================

  useEffect(() => {
    let cancelled = false;
    let viewer: Cesium.Viewer | undefined;

    let inputCanvas: HTMLCanvasElement | undefined;

    let handleWheel: ((event: WheelEvent) => void) | undefined;

    let handlePointerDown: ((event: PointerEvent) => void) | undefined;

    let handlePointerMove: ((event: PointerEvent) => void) | undefined;

    let handlePointerUp: ((event: PointerEvent) => void) | undefined;

    let handlePointerCancel: (() => void) | undefined;

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
          animation: false,
          timeline: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          baseLayerPicker: false,
          infoBox: false,
          selectionIndicator: false,
          scene3DOnly: true,
          baseLayer: false,
          globe: false,
        });

        viewerRef.current = viewer;

        viewer.scene.backgroundColor =
          Cesium.Color.fromCssColorString("#080b16");

        // ======================================
        // CAMERA CONFIGURATION
        // ======================================

        const controller = viewer.scene.screenSpaceCameraController;

        controller.enableInputs = true;

        // Disable default rotation.
        // We will implement our own mouse rotation.
        controller.enableRotate = false;

        // Preserve other camera interactions.
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        controller.enableTranslate = false;

        controller.enableCollisionDetection = false;

        // Keep native trackpad pinch zoom.
        controller.zoomEventTypes = [Cesium.CameraEventType.PINCH];

        controller.zoomFactor = 5.0;
        controller.minimumZoomDistance = 100;
        controller.maximumZoomDistance = 50_000_000;

        // ======================================
        // CUSTOM MOUSE DRAG ROTATION
        // ======================================

        const canvas = viewer.scene.canvas;

        inputCanvas = canvas;

        let isDragging = false;

        let lastX = 0;
        let lastY = 0;

        // Maximum close-up rotation sensitivity.
        const MAX_ZOOM_SENSITIVITY = 8;

        // Base rotation sensitivity.
        const BASE_ROTATION_SENSITIVITY = 0.0008;

        // --------------------------------------
        // POINTER DOWN
        // --------------------------------------

        handlePointerDown = (event: PointerEvent) => {
          // Only left mouse button.
          if (event.pointerType !== "mouse" || event.button !== 0) {
            return;
          }

          isDragging = true;

          lastX = event.clientX;
          lastY = event.clientY;

          canvas.style.cursor = "grabbing";

          canvas.setPointerCapture(event.pointerId);

          event.preventDefault();
        };

        // --------------------------------------
        // POINTER MOVE
        // --------------------------------------

        handlePointerMove = (event: PointerEvent) => {
          if (!isDragging || !viewer || viewer.isDestroyed()) {
            return;
          }

          const camera = viewer.camera;

          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;

          lastX = event.clientX;
          lastY = event.clientY;

          if (deltaX === 0 && deltaY === 0) return;

          // ------------------------------------
          // CALCULATE CAMERA ALTITUDE
          // ------------------------------------

          const distance = Cesium.Cartesian3.magnitude(camera.positionWC);

          const altitude = Math.max(distance - MARS_RADIUS, 1);

          // ------------------------------------
          // ADAPTIVE ROTATION SENSITIVITY
          // ------------------------------------

          const zoomFactor = Math.min(
            MAX_ZOOM_SENSITIVITY,
            Math.max(1, Math.sqrt(MARS_RADIUS / altitude)),
          );

          const sensitivity = BASE_ROTATION_SENSITIVITY * zoomFactor;

          const horizontalAngle = -deltaX * sensitivity;

          const verticalAngle = deltaY * sensitivity;

          // ------------------------------------
          // GET CAMERA VECTORS
          // ------------------------------------

          let position = camera.positionWC.clone();
          let direction = camera.directionWC.clone();
          let up = camera.upWC.clone();
          let right = camera.rightWC.clone();

          // ------------------------------------
          // HORIZONTAL ROTATION
          // Rotate around Mars' north-south axis.
          // ------------------------------------

          const marsAxis = Cesium.Cartesian3.UNIT_Z;

          position = rotateVector(position, marsAxis, horizontalAngle);

          direction = rotateVector(direction, marsAxis, horizontalAngle);

          up = rotateVector(up, marsAxis, horizontalAngle);

          right = rotateVector(right, marsAxis, horizontalAngle);

          // ------------------------------------
          // VERTICAL ROTATION
          // Rotate around camera's right axis.
          // ------------------------------------

          position = rotateVector(position, right, verticalAngle);

          direction = rotateVector(direction, right, verticalAngle);

          up = rotateVector(up, right, verticalAngle);

          // ------------------------------------
          // APPLY CAMERA ROTATION
          // ------------------------------------

          camera.setView({
            destination: position,

            orientation: {
              direction,
              up,
            },
          });

          event.preventDefault();
        };

        // --------------------------------------
        // POINTER UP
        // --------------------------------------

        handlePointerUp = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;

          isDragging = false;

          canvas.style.cursor = "grab";

          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
        };

        // --------------------------------------
        // POINTER CANCEL
        // --------------------------------------

        handlePointerCancel = () => {
          isDragging = false;
          canvas.style.cursor = "grab";
        };

        // Register mouse events.
        canvas.style.cursor = "grab";

        canvas.addEventListener("pointerdown", handlePointerDown);

        canvas.addEventListener("pointermove", handlePointerMove);

        canvas.addEventListener("pointerup", handlePointerUp);

        canvas.addEventListener("pointercancel", handlePointerCancel);

        // ======================================
        // CUSTOM MOUSE / TRACKPAD WHEEL ZOOM
        // ======================================

        handleWheel = (event: WheelEvent) => {
          event.preventDefault();

          if (!viewer || viewer.isDestroyed()) return;

          const camera = viewer.camera;

          let delta = event.deltaY;

          // Normalize scroll values.
          if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            delta *= 16;
          } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            delta *= canvas.clientHeight;
          }

          if (Math.abs(delta) < 0.01) return;

          const distance = Cesium.Cartesian3.magnitude(camera.positionWC);

          const altitude = Math.max(distance - MARS_RADIUS, 1);

          const sensitivity = 0.0015;

          const zoomFraction = 1 - Math.exp(-Math.abs(delta) * sensitivity);

          const minimumZoomStep = Math.min(altitude * 0.03, 10);

          const zoomAmount = Math.min(
            Math.max(altitude * zoomFraction, minimumZoomStep),
            altitude * 0.35,
          );

          if (delta < 0) {
            // Zoom IN.
            const maxZoomIn = Math.max(0, distance - MARS_RADIUS - 100);

            camera.zoomIn(Math.min(zoomAmount, maxZoomIn));
          } else {
            // Zoom OUT.
            const maxZoomOut = Math.max(0, 50_000_000 - distance);

            camera.zoomOut(Math.min(zoomAmount, maxZoomOut));
          }
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });

        // ======================================
        // LOCATION VISIBILITY
        // ======================================

        const LABEL_VISIBLE_DISTANCE = 2_500_000;
        const MARKER_VISIBLE_DISTANCE = 8_000_000;

        // ======================================
        // LOAD MARS 3D TILES
        // ======================================

        const mars = await Cesium.Cesium3DTileset.fromIonAssetId(3644333);

        if (cancelled || viewer.isDestroyed()) {
          mars.destroy();
          return;
        }

        viewer.scene.primitives.add(mars);

        // ======================================
        // ADD MARS LOCATIONS
        // ======================================

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

              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                MARKER_VISIBLE_DISTANCE,
              ),
            },

            label: {
              text: location.name,
              font: "14px sans-serif",

              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,

              style: Cesium.LabelStyle.FILL_AND_OUTLINE,

              pixelOffset: new Cesium.Cartesian2(0, -22),

              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                LABEL_VISIBLE_DISTANCE,
              ),

              scaleByDistance: new Cesium.NearFarScalar(
                500_000,
                1.0,
                LABEL_VISIBLE_DISTANCE,
                0.5,
              ),
            },
          });
        });

        // ======================================
        // INITIAL CAMERA POSITION
        // ======================================

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            77.58,
            18.38,
            4_000_000,
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

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      cancelled = true;

      if (inputCanvas) {
        if (handleWheel) {
          inputCanvas.removeEventListener("wheel", handleWheel);
        }

        if (handlePointerDown) {
          inputCanvas.removeEventListener("pointerdown", handlePointerDown);
        }

        if (handlePointerMove) {
          inputCanvas.removeEventListener("pointermove", handlePointerMove);
        }

        if (handlePointerUp) {
          inputCanvas.removeEventListener("pointerup", handlePointerUp);
        }

        if (handlePointerCancel) {
          inputCanvas.removeEventListener("pointercancel", handlePointerCancel);
        }

        inputCanvas.style.cursor = "";
      }

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }

      viewerRef.current = null;
    };
  }, []);

  // ==========================================
  // CAMERA DISTANCE
  // ==========================================

  const getCameraDistance = () => {
    const camera = viewerRef.current?.camera;

    if (!camera) return null;

    return Cesium.Cartesian3.magnitude(camera.positionWC);
  };

  // ==========================================
  // ZOOM IN
  // ==========================================

  const zoomIn = () => {
    const camera = viewerRef.current?.camera;
    const distance = getCameraDistance();

    if (!camera || distance === null) return;

    const altitude = Math.max(distance - MARS_RADIUS, 100);

    const zoomAmount = Math.max(Math.min(altitude * 0.2, 500_000), 25);

    camera.zoomIn(zoomAmount);
  };

  // ==========================================
  // ZOOM OUT
  // ==========================================

  const zoomOut = () => {
    const camera = viewerRef.current?.camera;
    const distance = getCameraDistance();

    if (!camera || distance === null) return;

    const altitude = Math.max(distance - MARS_RADIUS, 100);

    const zoomAmount = Math.max(Math.min(altitude * 0.3, 500_000), 25);

    camera.zoomOut(zoomAmount);
  };

  // ==========================================
  // CAMERA ROTATION BUTTONS
  // ==========================================

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

  // ==========================================
  // RESET CAMERA
  // ==========================================

  const resetCamera = () => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        77.58,
        18.38,
        4_000_000,
        Cesium.Ellipsoid.MARS,
      ),

      duration: 2,
    });

    setSelectedLocation(null);
  };

  // ==========================================
  // FLY TO LOCATION
  // ==========================================

  const flyToLocation = (location: MarsLocation) => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    setSelectedLocation(location);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        location.longitude,
        location.latitude,
        150_000,
        Cesium.Ellipsoid.MARS,
      ),

      duration: 2,
    });

    setMenuOpen(false);
  };

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#080b16] text-white">
      {/* Cesium viewer */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Header */}
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

      {/* Backdrop */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 z-20 bg-black/40"
        />
      )}

      {/* Navigation drawer */}
      <aside
        className={`absolute right-0 top-0 z-20 h-full w-[320px] max-w-[85vw] border-l border-white/10 bg-[#101525]/95 p-6 pt-24 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto">
          {/* Camera controls */}
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
                ⌂
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

          {/* Mars locations */}
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

          {/* Footer */}
          <div className="mt-auto border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500">MARS EXPLORATION SYSTEM</p>

            <p className="mt-1 text-xs text-gray-600">
              Navigate the Martian surface.
            </p>
          </div>
        </div>
      </aside>

      {/* Selected location */}
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
            {selectedLocation.latitude.toFixed(2)}° latitude,{" "}
            {selectedLocation.longitude.toFixed(2)}° longitude
          </p>
        </div>
      )}
      {/* Achievement toast */}
      <style>{`@keyframes achievementIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      {achievement && (
        <img
          src="/images/achievementinmars.png"
          alt="Achievement"
          style={{
            position: "absolute", top: 72, right: 20, zIndex: 50,
            width: 480, height: "auto",
            animation: "achievementIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        />
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

// ==========================================
// REUSABLE CONTROL BUTTON
// ==========================================

function ControlButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
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
