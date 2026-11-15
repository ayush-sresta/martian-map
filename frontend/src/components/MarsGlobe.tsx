"use client";

import MarsDialogue from "./MarsDialogue";
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
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [menuHint, setMenuHint] = useState(false);

  // Show achievement when Mars finishes loading
  useEffect(() => {
    if (!loading && !error) {
      setAchievement(true);
      setDialogueOpen(true);
      const audio = new Audio("/audio/minecraftacheivement.mp3");
      audio.play().catch(() => {});
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
    let cursorObserver: MutationObserver | undefined;

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

        // Force custom CSS cursor by blocking Cesium's inline cursor changes
        cursorObserver = new MutationObserver(() => {
          if (canvas.style.cursor) canvas.style.cursor = "";
        });
        cursorObserver.observe(canvas, { attributes: true, attributeFilter: ["style"] });
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

          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
        };

        // --------------------------------------
        // POINTER CANCEL
        // --------------------------------------

        handlePointerCancel = () => {
          isDragging = false;
        };

        // Register mouse events.
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
        cursorObserver?.disconnect();
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
        <h1 style={{ fontFamily: "MainFont, sans-serif", fontSize: "1.6rem", color: "white" }}>
          Mission: Mars
        </h1>
      </header>

      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => { setMenuOpen((open) => !open); setMenuHint(false); }}
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

      {/* Menu hint: points at the hamburger after the dialogue */}
      {menuHint && !menuOpen && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-[72px] z-30 flex w-12 flex-col items-center text-white"
          style={{ fontFamily: "MainFont, sans-serif", animation: "menuHintBounce 1s ease-in-out infinite" }}
        >
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
            <path d="M14 2 L26 16 H18 V34 H10 V16 H2 Z" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span className="mt-1 text-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>menu</span>
        </div>
      )}

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
        style={{ fontFamily: "MainFont, sans-serif" }}
        className={`absolute right-0 top-0 z-20 flex h-full w-64 flex-col border-l border-neutral-200 bg-white text-neutral-900 transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-20 pb-6">
          <h2 className="mb-3 text-xs text-neutral-400">Locations</h2>
          <ul className="flex flex-col">
            {MARS_LOCATIONS.map((location) => {
              const active = selectedLocation?.name === location.name;
              return (
                <li key={location.name}>
                  <button
                    type="button"
                    onClick={() => flyToLocation(location)}
                    disabled={loading}
                    className={`w-full border-b border-neutral-100 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${
                      active ? "text-black" : "text-neutral-500 hover:text-black"
                    }`}
                  >
                    {active && <span className="mr-2">•</span>}
                    {location.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Bottom-left: selected location + move controls */}
      <div
        style={{ fontFamily: "MainFont, sans-serif" }}
        className="absolute bottom-6 left-5 z-10 flex flex-col items-start gap-2 text-neutral-900"
      >
        {/* Selected location */}
        {selectedLocation && (
          <div className="max-w-xs rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-base">{selectedLocation.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">{selectedLocation.description}</p>
            <p className="mt-2 text-xs text-neutral-400">
              {selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°
            </p>
          </div>
        )}

        {/* Move controls */}
        <div className="flex gap-2">
          <ButtonGroup>
            <ControlButton onClick={rotateLeft} disabled={loading} label="Rotate left">←</ControlButton>
            <ControlButton onClick={rotateUp} disabled={loading} label="Tilt up">↑</ControlButton>
            <ControlButton onClick={rotateDown} disabled={loading} label="Tilt down">↓</ControlButton>
            <ControlButton onClick={rotateRight} disabled={loading} label="Rotate right">→</ControlButton>
          </ButtonGroup>
          <ButtonGroup>
            <ControlButton onClick={resetCamera} disabled={loading} label="Reset view">Reset</ControlButton>
          </ButtonGroup>
          <ButtonGroup>
            <ControlButton onClick={zoomOut} disabled={loading} label="Zoom out">−</ControlButton>
            <ControlButton onClick={zoomIn} disabled={loading} label="Zoom in">+</ControlButton>
          </ButtonGroup>
        </div>
      </div>

      {/* Achievement toast */}
      <style>{`@font-face { font-family: 'MainFont'; src: url('/main.ttf'); } @keyframes menuHintBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } @keyframes achievementIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      {achievement && (
        <img
          src="/images/achievementinmars.png"
          alt="Achievement"
          style={{
            position: "absolute", top: 1, right: 72, zIndex: 50,
            width: 600, height: "auto",
            animation: "achievementIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        />
      )}

      {/* Post-load dialogue */}
      {dialogueOpen && <MarsDialogue onDone={() => { setDialogueOpen(false); setMenuHint(true); }} />}

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

function ButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex divide-x divide-neutral-200 overflow-hidden rounded bg-white shadow-sm">
      {children}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-8 items-center justify-center px-2 text-sm text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
