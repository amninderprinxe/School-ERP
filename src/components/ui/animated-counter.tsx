"use client";

import { useEffect, useRef }         from "react";
import { useInView, useMotionValue, useSpring, useTransform, motion } from "framer-motion";
import { cn }                         from "@/lib/utils";

// ── Animated number counter ───────────────────────────────────────

interface CounterProps {
  value:        number;
  duration?:    number;     // ms
  formatter?:   (n: number) => string;
  className?:   string;
  prefix?:      string;
  suffix?:      string;
  decimals?:    number;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  formatter,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: CounterProps) {
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const motionVal = useMotionValue(0);
  const spring    = useSpring(motionVal, {
    stiffness: 60,
    damping:   18,
    mass:      0.8,
  });

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  const display = useTransform(spring, (v) => {
    const formatted = formatter
      ? formatter(v)
      : v.toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
    return `${prefix}${formatted}${suffix}`;
  });

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

// ── Currency counter ──────────────────────────────────────────────

export function CurrencyCounter({
  value,
  className,
}: {
  value:      number;
  className?: string;
}) {
  function fmtInr(n: number): string {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
    if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
    if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }

  return (
    <AnimatedCounter
      value={value}
      formatter={fmtInr}
      className={className}
    />
  );
}

// ── Percentage counter ────────────────────────────────────────────

export function PctCounter({
  value,
  className,
  decimals = 1,
}: {
  value:      number;
  className?: string;
  decimals?:  number;
}) {
  return (
    <AnimatedCounter
      value={value}
      suffix="%"
      decimals={decimals}
      className={className}
    />
  );
}