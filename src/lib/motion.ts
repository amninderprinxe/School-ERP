// ── Central animation config ──────────────────────────────────────
// All durations, easings and spring configs live here so the whole
// app stays visually consistent.

export const DURATION = {
  instant: 0.08,
  fast:    0.15,
  base:    0.22,
  slow:    0.35,
  slower:  0.5,
} as const;

export const EASE = {
  out:     [0.0,  0.0,  0.2, 1.0] as const,
  in:      [0.4,  0.0,  1.0, 1.0] as const,
  inOut:   [0.4,  0.0,  0.2, 1.0] as const,
  spring:  [0.23, 1.0,  0.32, 1.0] as const,
  bounce:  [0.34, 1.56, 0.64, 1.0] as const,
} as const;

export const SPRING = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 36, mass: 0.8 },
  soft:   { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.9 },
  bouncy: { type: "spring" as const, stiffness: 380, damping: 22, mass: 1.0 },
  slow:   { type: "spring" as const, stiffness: 180, damping: 28, mass: 1.0 },
} as const;

// ── Common variant sets ───────────────────────────────────────────

export const fadeInUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,
    transition: { duration: DURATION.base, ease: EASE.spring } },
  exit:    { opacity: 0, y: -8,
    transition: { duration: DURATION.fast, ease: EASE.in } },
};

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1,
    transition: { duration: DURATION.base, ease: EASE.out } },
  exit:    { opacity: 0,
    transition: { duration: DURATION.fast, ease: EASE.in } },
};

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1,
    transition: { duration: DURATION.base, ease: EASE.spring } },
  exit:    { opacity: 0, scale: 0.96,
    transition: { duration: DURATION.fast, ease: EASE.in } },
};

export const slideInLeft = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0,
    transition: { duration: DURATION.base, ease: EASE.spring } },
  exit:    { opacity: 0, x: -20,
    transition: { duration: DURATION.fast, ease: EASE.in } },
};

export const slideInRight = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0,
    transition: { duration: DURATION.base, ease: EASE.spring } },
  exit:    { opacity: 0, x: 20,
    transition: { duration: DURATION.fast, ease: EASE.in } },
};

export const slideUp = {
  hidden:  { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0,
    transition: SPRING.soft },
  exit:    { opacity: 0, y: "100%",
    transition: { duration: DURATION.base, ease: EASE.in } },
};

export const staggerChildren = {
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

export const listItem = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0,
    transition: { duration: DURATION.base, ease: EASE.spring } },
};

// ── prefers-reduced-motion guard ──────────────────────────────────

export function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}