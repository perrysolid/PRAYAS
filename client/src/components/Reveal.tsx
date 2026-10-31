import type { CSSProperties, HTMLAttributes } from "react";
import { useInView } from "../hooks/useInView";

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({ delay = 0, className = "", style, children, ...rest }: HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.12);
  return (
    <div ref={ref} className={`reveal${inView ? " is-in" : ""} ${className}`} style={{ "--d": `${delay}ms`, ...style } as CSSProperties} {...rest}>
      {children}
    </div>
  );
}
