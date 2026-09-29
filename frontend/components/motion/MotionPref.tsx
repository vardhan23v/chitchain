"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

export type MotionPref = "system" | "on" | "off";
export const MOTION_KEY = "chitchain:motion";

interface Ctx {
  pref: MotionPref;
  setPref: (p: MotionPref) => void;
  /** True when animations should run: the site preference first, then the OS setting. */
  enabled: boolean;
  /** The OS asks for reduced motion. */
  systemReduce: boolean;
}

const MotionPrefContext = createContext<Ctx>({ pref: "system", setPref: () => undefined, enabled: true, systemReduce: false });

function readPref(): MotionPref {
  try {
    const v = window.localStorage.getItem(MOTION_KEY);
    return v === "on" || v === "off" ? v : "system";
  } catch {
    return "system";
  }
}

/**
 * Per-site animation preference. "system" follows prefers-reduced-motion, "on" and "off" override it.
 * Stored in localStorage and mirrored on <html data-motion> (set before paint by the inline script in app/layout.tsx),
 * which the CSS in globals.css uses to keep or drop keyframe animations. Wraps framer's MotionConfig so every motion
 * component follows the same decision.
 */
export function MotionPrefProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<MotionPref>("system");
  const [systemReduce, setSystemReduce] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    setPrefState(readPref());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setSystemReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    // The inline script already set the attribute for the first paint; skip the first run so it is not cleared before state catches up.
    if (first.current) {
      first.current = false;
      return;
    }
    const el = document.documentElement;
    if (pref === "system") el.removeAttribute("data-motion");
    else el.setAttribute("data-motion", pref);
  }, [pref]);

  const setPref = useCallback((p: MotionPref) => {
    setPrefState(p);
    try {
      if (p === "system") window.localStorage.removeItem(MOTION_KEY);
      else window.localStorage.setItem(MOTION_KEY, p);
    } catch {
      /* private mode / quota */
    }
  }, []);

  const enabled = pref === "on" ? true : pref === "off" ? false : !systemReduce;
  const value = useMemo(() => ({ pref, setPref, enabled, systemReduce }), [pref, setPref, enabled, systemReduce]);

  return (
    <MotionPrefContext.Provider value={value}>
      <MotionConfig reducedMotion={pref === "on" ? "never" : pref === "off" ? "always" : "user"}>{children}</MotionConfig>
    </MotionPrefContext.Provider>
  );
}

export function useMotionPref(): Ctx {
  return useContext(MotionPrefContext);
}

/** True when animations should run. */
export function useMotionOK(): boolean {
  return useContext(MotionPrefContext).enabled;
}

/** Drop-in for framer's hook: true when motion should be reduced, following the site preference and then the OS. */
export function useReducedMotion(): boolean {
  return !useContext(MotionPrefContext).enabled;
}
