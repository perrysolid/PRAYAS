import { useEffect, useMemo, useState } from "react";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Split into what a reader sees as single characters, so Hindi vowel signs are never typed apart from their letters. */
function characters(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Segmenter ? Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
}

/**
 * Types its text out one character at a time, then types it again every few minutes.
 * The full text always takes up its space, so nothing below it jumps. Screen readers get the whole text at once,
 * and people who prefer reduced motion see it without the typing.
 */
export function Typewriter({ text, speed = 64, every = 210_000 }: { text: string; speed?: number; every?: number }) {
  const chars = useMemo(() => characters(text), [text]);
  const reduced = prefersReducedMotion();
  const [count, setCount] = useState(reduced ? chars.length : 0);

  useEffect(() => {
    if (reduced) {
      setCount(chars.length);
      return;
    }
    let timer = 0;
    const run = () => {
      let i = 0;
      setCount(0);
      const tick = () => {
        i += 1;
        setCount(i);
        timer = window.setTimeout(i < chars.length ? tick : run, i < chars.length ? speed : every);
      };
      timer = window.setTimeout(tick, 450);
    };
    run();
    return () => window.clearTimeout(timer);
  }, [chars, speed, every, reduced]);

  // Group into words so a word never breaks across lines while it is being typed.
  const words: { chars: string[]; start: number }[] = [];
  let current: { chars: string[]; start: number } | null = null;
  chars.forEach((ch, i) => {
    if (ch === " ") {
      current = null;
      return;
    }
    if (!current) {
      current = { chars: [], start: i };
      words.push(current);
    }
    current.chars.push(ch);
  });

  return (
    <span className="typewriter" aria-hidden="true">
      {words.map((w, wi) => (
        <span key={wi}>
          {wi > 0 && " "}
          <span className="typewriter__word">
            {w.chars.map((ch, ci) => {
              const index = w.start + ci;
              const typed = index < count;
              const last = typed && index === count - 1 && count < chars.length;
              return <span key={ci} className={last ? "typewriter__ch is-last" : "typewriter__ch"} style={typed ? undefined : { opacity: 0 }}>{ch}</span>;
            })}
          </span>
        </span>
      ))}
    </span>
  );
}
