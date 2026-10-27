"use client";

import { useEffect, useRef } from "react";
import BackendOffline from "@/components/BackendOffline";
import s from "./landing.module.css";

export default function TeamCortexDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pm") === "true") {
      ref.current?.showModal();
    }
  }, []);

  const onClose = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("pm");
    window.history.replaceState(null, "", url);
  };

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="team-cortex-title"
      onClose={onClose}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === ref.current;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === ref.current) {
          ref.current?.close();
        }
      }}
    >
      <div className={s.dialogBody}>
        <div className={s.dialogHead}>
          <p id="team-cortex-title" className={s.label}>
            Team Cortex
          </p>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
        <BackendOffline title="Team Cortex" />
      </div>
    </dialog>
  );
}
