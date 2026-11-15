"use client";
import type { CSSProperties } from "react";

// Hand-drawn wax-crayon icons. Each icon is a colour layer (a fat, slightly
// offset stroke or fill, so colour spills past the outline) under a thin, wobbly
// ink outline. The `wax` filter in public/crayon.svg adds the shaky edges and
// waxy grain.
//
// All paths are drawn on a 24x24 grid, and the arrow is drawn pointing right
// and rotated for the other directions.

const INK = "#1c1c3a";
const PAPER = "#f4ead5";

type Layer = {
  paths: string[];
  closed?: boolean; // closed shapes get a colour fill as well as a stroke
};

function Icon({
  layer,
  color,
  size = 30,
  rotate = 0,
  ink = INK,
  colourWidth = 4.2,
  style,
}: {
  layer: Layer;
  color: string;
  size?: number;
  rotate?: number;
  ink?: string;
  colourWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className="wax"
      style={style}
      aria-hidden
    >
      <g transform={`rotate(${rotate} 12 12)`}>
        {/* Colour, pushed slightly off the outline */}
        <g
          transform="translate(0.9 -0.7)"
          stroke={color}
          strokeWidth={colourWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={layer.closed ? color : "none"}
          opacity={1}
        >
          {layer.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {/* Thin, uneven ink outline */}
        <g stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {layer.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

// Arrow pointing right; rotate it for the other directions.
const ARROW: Layer = {
  paths: [
    "M4 12.4 C9 11.5 14.5 12.9 20.2 11.7",
    "M14.6 6.1 C16.5 8.2 18.3 10.1 20.4 11.8 C18.3 13.5 16.5 15.5 14.1 17.9",
  ],
};

export function ArrowIcon({
  direction,
  color = INK,
}: {
  direction: "left" | "right" | "up" | "down";
  color?: string;
}) {
  const rotate = { right: 0, down: 90, left: 180, up: -90 }[direction];
  return <Icon layer={ARROW} color={color} rotate={rotate} />;
}

export function PlusIcon({ color = INK }: { color?: string }) {
  return (
    <Icon
      layer={{
        paths: [
          "M12.4 4.6 C12.9 8.2 11.7 14.6 12.3 19.6",
          "M4.7 12.3 C8.1 11.7 14.9 12.7 19.5 11.8",
        ],
      }}
      color={color}
    />
  );
}

export function MinusIcon({ color = INK }: { color?: string }) {
  return <Icon layer={{ paths: ["M4.8 12.4 C9.1 11.8 15 12.7 19.4 11.9"] }} color={color} />;
}

export function SpeakerIcon({ muted, color = INK }: { muted: boolean; color?: string }) {
  const body = "M4.4 9.4 C5.8 9.5 7 9.3 8.2 9.5 L12.6 5.4 C12.9 11.8 12.5 14.9 12.8 18.6 L8.2 14.5 C6.8 14.6 5.6 14.4 4.3 14.6 Z";
  const waves = muted
    ? ["M16.2 9.2 L21 14.8", "M21.1 9.1 L16.1 14.9"]
    : ["M15.2 8.6 C16.9 10.2 16.9 13.8 15.2 15.4", "M18.9 5.8 C21.8 9 21.8 15 18.9 18.2"];
  return <Icon layer={{ paths: [body, ...waves], closed: false }} color={color} />;
}

// Pointer that hints at the menu button, pointing up.
export function PointerIcon({ color = INK }: { color?: string }) {
  return (
    <Icon
      layer={{
        paths: [
          "M14.1 3.2 C15.2 6.1 17.4 8.9 21 12.9 C18.4 12.9 16.5 12.8 15.7 12.6 C15.8 16.1 15.5 19.8 15.3 22.8 C13.7 22.9 12.2 22.9 10.6 22.8 C10.4 19.8 10.2 16.1 10.3 12.6 C9.1 12.8 7.1 13 4.6 12.9 C8.1 8.9 11.8 6.1 14.1 3.2 Z",
        ],
        closed: true,
      }}
      color={color}
      size={28}
      ink={PAPER}
    />
  );
}

// Upright rocket for the menu button: a solid dark blue silhouette so it reads at button size.
export function RocketIcon({ size = 36 }: { size?: number }) {
  return (
    <Icon
      layer={{
        paths: [
          "M12 2 C15.5 4.5 16.5 9 16.3 14 L19.5 18.5 L16.4 19 L15.8 21.5 L8.2 21.5 L7.6 19 L4.5 18.5 L7.7 14 C7.5 9 8.5 4.5 12 2 Z",
        ],
        closed: true,
      }}
      color={INK}
      size={size}
      colourWidth={1.5}
    />
  );
}
