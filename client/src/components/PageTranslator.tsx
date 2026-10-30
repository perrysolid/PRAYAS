import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { translateStrings } from "../lib/ai";
import { languageOf } from "../lib/languages";

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "PRE"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const worthTranslating = (s: string) => /\p{L}{2,}/u.test(s) && !/^CMH-\d{4}-\d+$/.test(s.trim());

/** What we wrote into each node, so a later change by React can be told apart from our own. */
const applied = new WeakMap<Node, string>();
const original = new WeakMap<Node, string>();
const appliedAttr = new WeakMap<Element, Record<string, string>>();
const originalAttr = new WeakMap<Element, Record<string, string>>();
const touched = new Set<Node>();

function skipped(el: Element | null) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.hasAttribute("data-no-translate") || e.getAttribute("translate") === "no") return true;
  }
  return false;
}

function collect(root: Element) {
  const texts: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    const value = node.nodeValue ?? "";
    if (!worthTranslating(value) || applied.get(node) === value || skipped(node.parentElement)) continue;
    texts.push(node);
  }
  const attrs: [Element, string][] = [];
  root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach((el) => {
    if (skipped(el) && !(el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && worthTranslating(v) && appliedAttr.get(el)?.[a] !== v) attrs.push([el, a]);
    }
  });
  return { texts, attrs };
}

async function translatePage(locale: string, onWork: (busy: boolean) => void) {
  const { texts, attrs } = collect(document.body);
  if (!texts.length && !attrs.length) return;
  onWork(true);
  const sources = [
    ...texts.map((n) => {
      const v = n.nodeValue ?? "";
      original.set(n, v);
      return v.trim();
    }),
    ...attrs.map(([el, a]) => {
      const v = el.getAttribute(a) ?? "";
      originalAttr.set(el, { ...originalAttr.get(el), [a]: v });
      return v;
    }),
  ];
  const out = await translateStrings(sources, locale).finally(() => onWork(false));
  texts.forEach((n, i) => {
    const src = original.get(n) ?? "";
    // Keep the surrounding spaces React put around inline text.
    const next = src.replace(src.trim(), out[i]);
    if (n.nodeValue !== src) return; // React changed it meanwhile; the next pass picks it up.
    n.nodeValue = next;
    applied.set(n, next);
    touched.add(n);
  });
  attrs.forEach(([el, a], j) => {
    const next = out[texts.length + j];
    el.setAttribute(a, next);
    appliedAttr.set(el, { ...appliedAttr.get(el), [a]: next });
    touched.add(el);
  });
}

function restore() {
  for (const n of touched) {
    if (n.nodeType === Node.TEXT_NODE) {
      const src = original.get(n);
      if (src !== undefined && applied.get(n) === n.nodeValue) n.nodeValue = src;
      applied.delete(n);
    } else {
      const el = n as Element;
      const src = originalAttr.get(el) ?? {};
      for (const [a, v] of Object.entries(src)) if (appliedAttr.get(el)?.[a] === el.getAttribute(a)) el.setAttribute(a, v);
      appliedAttr.delete(el);
    }
  }
  touched.clear();
}

/**
 * Shows the whole site in languages that have no hand-written copy (Garhwali, Kumaoni, Nepali,
 * Punjabi, Urdu and more), by translating the English interface text in place as it renders.
 */
export function PageTranslator() {
  const { machine, locale, setLocale } = useI18n();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!machine) {
      restore();
      return;
    }
    let timer = 0;
    let running = false;
    let again = false;
    const run = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        await translatePage(locale, setBusy);
      } finally {
        running = false;
        if (again) {
          again = false;
          schedule();
        }
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 120);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    run();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      restore();
    };
  }, [machine, locale]);

  if (!machine) return null;
  const lang = languageOf(locale);
  return (
    <div className="mt-banner" role="status" data-no-translate>
      <div className="container mt-banner__inner">
        <Languages size={18} aria-hidden="true" />
        <span>
          <span lang={locale}>{lang.native}</span> · Translated automatically from English{busy ? "…" : "."} Official records stay in Hindi and English.
        </span>
        <button type="button" className="mt-banner__btn" onClick={() => setLocale("en")}>Show English</button>
      </div>
    </div>
  );
}
