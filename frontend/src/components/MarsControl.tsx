"use client";

import type { Viewer } from "cesium";
import * as Cesium from "cesium";

interface Props {
  viewer: Viewer | null;
}

export default async function MarsControls({ viewer }: Props) {
  const zoomIn = () => {
    if (!viewer) return;

    viewer.camera.zoomIn(200000);
  };

  const zoomOut = () => {
    if (!viewer) return;

    viewer.camera.zoomOut(200000);
  };

  const rotateLeft = () => {
    if (!viewer) return;

    viewer.camera.rotateLeft(0.2);
  };

  const rotateRight = () => {
    if (!viewer) return;

    viewer.camera.rotateRight(0.2);
  };

  const tiltUp = () => {
    if (!viewer) return;

    viewer.camera.rotateUp(0.1);
  };

  const tiltDown = () => {
    if (!viewer) return;

    viewer.camera.rotateDown(0.1);
  };

  const reset = () => {
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
  };

  return (
    <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
      <button onClick={zoomIn}>+</button>
      <button onClick={zoomOut}>−</button>

      <button onClick={rotateLeft}>↶</button>
      <button onClick={rotateRight}>↷</button>

      <button onClick={tiltUp}>↑</button>
      <button onClick={tiltDown}>↓</button>

      <button onClick={reset}>Reset</button>
    </div>
  );
}
