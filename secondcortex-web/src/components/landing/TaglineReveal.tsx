"use client";

import { useEffect, useRef, useState } from "react";
import s from "./landing.module.css";

export default function TaglineReveal({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lit, setLit] = useState(0);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const trigger = window.innerHeight * 0.7;
      const progress = (trigger - rect.top) / Math.max(rect.height, 1);
      setLit(Math.max(0, Math.min(words.length, Math.ceil(progress * words.length))));
    };
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        update();
      } else {
        window.removeEventListener("scroll", onScroll);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [words.length]);

  return (
    <p ref={ref} className={s.tagline}>
      {words.map((word, i) => (
        <span key={i} className={s.word} data-on={i < lit ? "" : undefined}>
          {word}{" "}
        </span>
      ))}
    </p>
  );
}
