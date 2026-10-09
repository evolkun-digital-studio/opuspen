import { useId } from "react";
import { inkRoutes, WET_TAILS, type InkWordData } from "./ink-data";

type InkWordProps = {
  data: InkWordData;
  className?: string;
  /** Hidden route paths for a pen to follow (the hero). */
  routes?: boolean;
};

/**
 * A word in gold ink. The fill is shown through a mask of its centre-line
 * strokes (white, round, 1.6x the thickest stem), so drawing those strokes
 * with stroke-dashoffset lays the ink down where, and in the order, a nib
 * would. Without scripts, or with reduced motion, the strokes are whole and
 * the word is simply there. Sized in em: 1em = 1000 font units.
 */
export function InkWord({ data, className, routes = false }: InkWordProps) {
  const id = `ink${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [x = 0, y = 0, width = 0, height = 0] = data.viewBox;
  const strokeWidth = Math.round(data.stem * 1.6);
  const route = routes ? inkRoutes(data) : null;
  const box = { x, y, width, height };

  return (
    <svg
      className={["ink-word", className].filter(Boolean).join(" ")}
      viewBox={data.viewBox.join(" ")}
      style={{ width: `${width / 1000}em`, height: `${height / 1000}em` }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-gold`}
          gradientUnits="userSpaceOnUse"
          x1={x}
          y1={y}
          x2={x + width}
          y2={y + height}
        >
          <stop offset="0" className="ink-stop ink-stop--deep" />
          <stop offset=".35" className="ink-stop ink-stop--soft" />
          <stop offset=".5" className="ink-stop ink-stop--pale" />
          <stop offset=".7" className="ink-stop ink-stop--gold" />
          <stop offset="1" className="ink-stop ink-stop--bronze" />
        </linearGradient>
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="ink-stop ink-stop--light" stopOpacity="0" />
          <stop offset=".5" className="ink-stop ink-stop--light ink-stop--peak" stopOpacity=".85" />
          <stop offset="1" className="ink-stop ink-stop--light" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-glyphs`}>
          <path d={data.fill} />
        </clipPath>
        <mask id={`${id}-ink`} maskUnits="userSpaceOnUse" {...box}>
          {data.skeleton.map((stroke, index) => (
            <path key={index} className="ink-word-stroke" d={stroke.d} strokeWidth={strokeWidth} />
          ))}
        </mask>
        <mask id={`${id}-wet`} maskUnits="userSpaceOnUse" {...box}>
          {data.skeleton.map((stroke, index) =>
            Array.from({ length: WET_TAILS }, (_, tail) => (
              <path
                key={`${index}-${tail}`}
                className="ink-word-wet"
                d={stroke.d}
                strokeWidth={strokeWidth}
                data-stroke={index}
              />
            )),
          )}
        </mask>
      </defs>

      <path d={data.fill} fill={`url(#${id}-gold)`} mask={`url(#${id}-ink)`} />
      {/* Fresh ink: brighter where the nib has just been, settling into the gold. */}
      <path className="ink-word-fresh" d={data.fill} mask={`url(#${id}-wet)`} />
      {/* One pass of light once the word is written, within the letters only. */}
      <g clipPath={`url(#${id}-glyphs)`}>
        <rect
          className="ink-word-sweep"
          x={x - width * 0.3}
          y={y}
          width={width * 0.3}
          height={height}
          fill={`url(#${id}-light)`}
        />
      </g>

      {route && (
        <g className="ink-word-routes" fill="none" stroke="none">
          {/* Rendered without paint, so they have a screen position to follow. */}
          {data.skeleton.map((stroke, index) => (
            <path key={index} className="ink-word-nib" d={stroke.d} />
          ))}
          <path className="ink-word-enter" d={route.enter} />
          {route.travel.map((d, index) => (
            <path key={index} className="ink-word-travel" d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}
