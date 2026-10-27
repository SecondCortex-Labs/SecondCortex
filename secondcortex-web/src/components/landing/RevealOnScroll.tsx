"use client";

import { useEffect } from "react";
import s from "./landing.module.css";

export default function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reveal = "";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-shown", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll(`.${s.reveal}`).forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      delete root.dataset.reveal;
    };
  }, []);

  return null;
}
