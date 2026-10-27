"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useLenis } from "@studio-freight/react-lenis";
import { LINKS, NAV_LINKS, PRIMARY_CTA, type SectionId } from "./content";
import s from "./SiteNav.module.css";

const SECTION_IDS = NAV_LINKS.flatMap((link) => (link.section ? [link.section] : []));

function useActiveSection() {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        setActive(SECTION_IDS.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, []);

  return active;
}

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const lenis = useLenis();
  const navRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      lenis?.stop();
    } else {
      lenis?.start();
    }
  }, [open, lenis]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const panel = panelRef.current;
    const background = [...(panel?.parentElement?.children ?? [])].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== panel && el !== navRef.current,
    );
    background.forEach((el) => {
      el.inert = true;
    });
    const desktop = window.matchMedia("(min-width: 900px)");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onWiden = (event: MediaQueryListEvent) => event.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWiden);
    return () => {
      background.forEach((el) => {
        el.inert = false;
      });
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWiden);
    };
  }, [open]);

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    if (!href.startsWith("#") || !lenis) {
      return;
    }
    event.preventDefault();
    // Lenis is stopped while the menu is open, and start() cancels any scroll already in flight.
    lenis.start();
    lenis.scrollTo(href === "#top" ? 0 : href, { offset: -80 });
    window.history.replaceState(null, "", href);
  };

  const links = NAV_LINKS.map((link) => ({
    ...link,
    current: link.section !== undefined && link.section === active,
  }));

  return (
    <>
      <nav ref={navRef} className={s.nav} aria-label="Main" data-open={open}>
        <a className={s.brand} href="#top" onClick={(event) => go(event, "#top")}>
          <svg className={s.mark} viewBox="0 0 12 12" aria-hidden="true">
            <rect x="0" y="0" width="4" height="4" />
            <rect x="8" y="0" width="4" height="4" />
            <rect x="4" y="4" width="4" height="4" />
            <rect x="0" y="8" width="4" height="4" />
            <rect x="8" y="8" width="4" height="4" />
          </svg>
          SecondCortex
        </a>

        <ul className={s.links}>
          {links.map((link) => (
            <li key={link.href}>
              <a
                className={s.link}
                href={link.href}
                aria-current={link.current ? "location" : undefined}
                onClick={(event) => go(event, link.href)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={s.actions}>
          <a className={`${s.small} ${s.ghost}`} href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub <span className={s.glyph}>↗</span>
          </a>
          <a className={`${s.small} ${s.primary}`} href={PRIMARY_CTA.href} target="_blank" rel="noreferrer">
            Install
          </a>
          <button
            ref={toggleRef}
            type="button"
            className={s.toggle}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div ref={panelRef} id="mobile-menu" className={s.panel} data-open={open} inert={!open} data-lenis-prevent>
        <ul className={s.panelLinks}>
          {[...links, { label: "GitHub", href: LINKS.github, current: false }].map((link, i) => (
            <li key={link.href} style={{ transitionDelay: open ? `${Math.min(i * 60, 400)}ms` : "0ms" }}>
              <a
                className={s.panelLink}
                href={link.href}
                aria-current={link.current ? "location" : undefined}
                onClick={(event) => go(event, link.href)}
                {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
