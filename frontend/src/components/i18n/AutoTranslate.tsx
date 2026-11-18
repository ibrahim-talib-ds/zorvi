"use client";

import { useEffect } from "react";
import { API_BASE } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT", "SVG"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const HAS_LETTER = /\p{L}/u;
const MAX_BATCH = 200;
const MAX_CHARS = 1900;

const cache = new Map<string, string>();
const inFlight = new Set<string>();

const textOrig = new WeakMap<Text, { orig: string; last: string }>();
type AttrState = { orig: string; last: string };
const attrOrig = new WeakMap<Element, Record<string, AttrState>>();

const keyOf = (lang: string, text: string) => `${lang}\u0000${text}`;

function skipped(el: Element | null): boolean {
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || e.hasAttribute("data-no-translate")) return true;
  }
  return false;
}

function split(s: string) {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return { lead: m[1], core: m[2], trail: m[3] };
}

type Item =
  | { kind: "text"; node: Text; core: string; lead: string; trail: string; orig: string }
  | { kind: "attr"; el: Element; attr: string; core: string; orig: string };

function collect(root: Element): Item[] {
  const items: Item[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    const current = node.nodeValue ?? "";
    if (!HAS_LETTER.test(current) || skipped(node.parentElement)) continue;

    const state = textOrig.get(node);
    const orig = state && state.last === current ? state.orig : current;
    const { lead, core, trail } = split(orig);
    if (core && core.length <= MAX_CHARS) items.push({ kind: "text", node, core, lead, trail, orig });
  }

  for (const el of Array.from(root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")))) {
    if (skipped(el)) continue;
    const states = attrOrig.get(el) ?? {};
    for (const attr of ATTRS) {
      const current = el.getAttribute(attr);
      if (!current || !HAS_LETTER.test(current)) continue;
      const st = states[attr];
      const orig = st && st.last === current ? st.orig : current;
      const core = orig.trim();
      if (core && core.length <= MAX_CHARS) items.push({ kind: "attr", el, attr, core, orig });
    }
  }
  return items;
}

async function fetchMissing(lang: string, texts: string[]) {
  const need = Array.from(new Set(texts)).filter(
    (t) => !cache.has(keyOf(lang, t)) && !inFlight.has(keyOf(lang, t))
  );
  for (let i = 0; i < need.length; i += MAX_BATCH) {
    const chunk = need.slice(i, i + MAX_BATCH);
    chunk.forEach((t) => inFlight.add(keyOf(lang, t)));
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: chunk, target: lang }),
      });
      if (!res.ok) throw new Error(`translate ${res.status}`);
      const { translations } = (await res.json()) as { translations: string[] };
      chunk.forEach((t, idx) => cache.set(keyOf(lang, t), translations[idx] ?? t));
    } catch (err) {
      console.warn("Auto-translate failed; page stays in English for these strings", err);
    } finally {
      chunk.forEach((t) => inFlight.delete(keyOf(lang, t)));
    }
  }
}

export function AutoTranslate() {
  const { lang } = useI18n();

  useEffect(() => {
    const root = document.body;
    let gen = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), 80);
    });

    const run = async () => {
      const my = ++gen;
      const items = collect(root);
      if (lang !== "en") await fetchMissing(lang, items.map((i) => i.core));
      if (my !== gen) return;

      obs.disconnect();
      for (const item of items) {
        const out = lang === "en" ? item.core : cache.get(keyOf(lang, item.core)) ?? item.core;

        if (item.kind === "text") {
          const value = lang === "en" ? item.orig : item.lead + out + item.trail;
          textOrig.set(item.node, { orig: item.orig, last: value });
          if (item.node.nodeValue !== value) item.node.nodeValue = value;
        } else {
          const value = lang === "en" ? item.orig : out;
          const states = attrOrig.get(item.el) ?? {};
          states[item.attr] = { orig: item.orig, last: value };
          attrOrig.set(item.el, states);
          if (item.el.getAttribute(item.attr) !== value) item.el.setAttribute(item.attr, value);
        }
      }
      obs.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRS,
      });
    };

    void run();

    return () => {
      gen++;
      clearTimeout(timer);
      obs.disconnect();
    };
  }, [lang]);

  return null;
}
