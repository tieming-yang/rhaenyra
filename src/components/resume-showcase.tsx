"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";
import { RESUME_PRODUCTS } from "@/domain/resume-showcase-data";
import { ResumeBadge } from "./resume-badge";
import { ResumeJobDeck } from "./resume-job-deck";

interface KeyCap {
  readonly id: string;
  readonly label?: string;
  readonly sub?: string;
  readonly size?: "sm" | "md" | "lg" | "xl" | "space" | "touch" | "arrows";
}

const keyboardRows: readonly (readonly KeyCap[])[] = [
  [
    { id: "esc", label: "esc", size: "sm" },
    { id: "f1", label: "F1" },
    { id: "f2", label: "F2" },
    { id: "f3", label: "F3" },
    { id: "f4", label: "F4" },
    { id: "f5", label: "F5" },
    { id: "f6", label: "F6" },
    { id: "f7", label: "F7" },
    { id: "f8", label: "F8" },
    { id: "f9", label: "F9" },
    { id: "f10", label: "F10" },
    { id: "f11", label: "F11" },
    { id: "f12", label: "F12" },
    { id: "touch", size: "touch" },
  ],
  [
    { id: "grave", sub: "~", label: "`" },
    { id: "1", sub: "!", label: "1" },
    { id: "2", sub: "@", label: "2" },
    { id: "3", sub: "#", label: "3" },
    { id: "4", sub: "$", label: "4" },
    { id: "5", sub: "%", label: "5" },
    { id: "6", sub: "^", label: "6" },
    { id: "7", sub: "&", label: "7" },
    { id: "8", sub: "*", label: "8" },
    { id: "9", sub: "(", label: "9" },
    { id: "0", sub: ")", label: "0" },
    { id: "minus", sub: "_", label: "-" },
    { id: "equal", sub: "+", label: "=" },
    { id: "delete", label: "⌫", size: "md" },
  ],
  [
    { id: "tab", label: "⇥", size: "md" },
    { id: "q", label: "Q" },
    { id: "w", label: "W" },
    { id: "e", label: "E" },
    { id: "r", label: "R" },
    { id: "t", label: "T" },
    { id: "y", label: "Y" },
    { id: "u", label: "U" },
    { id: "i", label: "I" },
    { id: "o", label: "O" },
    { id: "p", label: "P" },
    { id: "lbracket", sub: "{", label: "[" },
    { id: "rbracket", sub: "}", label: "]" },
    { id: "backslash", sub: "|", label: "\\" },
  ],
  [
    { id: "caps", label: "⇪", size: "lg" },
    { id: "a", label: "A" },
    { id: "s", label: "S" },
    { id: "d", label: "D" },
    { id: "f", label: "F" },
    { id: "g", label: "G" },
    { id: "h", label: "H" },
    { id: "j", label: "J" },
    { id: "k", label: "K" },
    { id: "l", label: "L" },
    { id: "semicolon", sub: ":", label: ";" },
    { id: "quote", sub: "\"", label: "'" },
    { id: "return", label: "⏎", size: "lg" },
  ],
  [
    { id: "lshift", label: "⇧", size: "xl" },
    { id: "z", label: "Z" },
    { id: "x", label: "X" },
    { id: "c", label: "C" },
    { id: "v", label: "V" },
    { id: "b", label: "B" },
    { id: "n", label: "N" },
    { id: "m", label: "M" },
    { id: "comma", sub: "<", label: "," },
    { id: "period", sub: ">", label: "." },
    { id: "slash", sub: "?", label: "/" },
    { id: "rshift", label: "⇧", size: "xl" },
  ],
  [
    { id: "fn", label: "fn" },
    { id: "ctrl", label: "⌃" },
    { id: "lopt", label: "⌥" },
    { id: "lcmd", label: "⌘", size: "sm" },
    { id: "space", label: "", size: "space" },
    { id: "rcmd", label: "⌘", size: "sm" },
    { id: "ropt", label: "⌥" },
    { id: "left", label: "◀" },
    { id: "updown", sub: "▲", label: "▼", size: "arrows" },
    { id: "right", label: "▶" },
  ],
];

function productArt(id: string) {
  return { backgroundImage: `url(/resume/${id}.svg)` };
}

export function ResumeShowcase() {
  const coverRef = useRef<HTMLElement>(null);
  const deskRef = useRef<HTMLElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [nearStudio, setNearStudio] = useState(false);
  const product = RESUME_PRODUCTS[selected];

  useEffect(() => {
    const cover = coverRef.current;
    const desk = deskRef.current;
    const studio = studioRef.current;
    if (!cover || !desk || !studio) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const tracks = [
      { element: cover, entry: 0.09, distance: 0.6 },
      { element: desk, entry: 0.88, distance: 0.62 },
      { element: studio, entry: 0.89, distance: 0.75 },
    ];

    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      for (const { element, entry, distance } of tracks) {
        if (reduce.matches) {
          element.style.removeProperty("--scene-progress");
          continue;
        }

        const top = element.getBoundingClientRect().top;
        const position = (viewport * entry - top) / (viewport * distance);
        const progress = Math.min(1, Math.max(0, position));
        element.style.setProperty("--scene-progress", String(progress * progress * (3 - 2 * progress)));
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setNearStudio(true);
      observer.disconnect();
    }, { rootMargin: "240px" });
    observer.observe(studio);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    schedule();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div className="resume-showcase">
      <section className="resume-cover-rail" ref={coverRef} aria-labelledby="profile-title">
        <div className="resume-cover">
          <div className="resume-cover-copy">
            <p className="resume-eyebrow">PROFILE / {CANDIDATE_PROFILE.targetCompany}</p>
            <h1 id="profile-title">
              {CANDIDATE_PROFILE.name}
              <span>把想法做成產品。</span>
            </h1>
            <p className="resume-cover-positioning">{CANDIDATE_PROFILE.chinesePositioning}</p>
          </div>

          <ResumeBadge />

          <div className="resume-cover-aside">
            <p>{CANDIDATE_PROFILE.executiveSummary}</p>
            <nav aria-label="履歷內容">
              <a href="#job-desk">工作與實習 <ArrowDown aria-hidden="true" /></a>
              <a href="#product-cases">產品案例 <ArrowDown aria-hidden="true" /></a>
            </nav>
          </div>

          <span className="resume-cover-mark" aria-hidden="true">{CANDIDATE_PROFILE.name}</span>
        </div>
      </section>

      <section className="resume-desk" id="job-desk" ref={deskRef} aria-labelledby="job-desk-title">
        <div className="resume-desk-inner">
          <ResumeJobDeck />
          <a className="resume-desk-next" href="#product-cases">產品案例 <ArrowDown aria-hidden="true" /></a>
        </div>
      </section>

      <section className="resume-studio-rail" id="product-cases" ref={studioRef} aria-labelledby="product-cases-title">
        <div className="resume-studio">
          <div className="resume-studio-inner">
            <div className="resume-case-copy">
              <p className="resume-eyebrow">03 / PRODUCT CASES / 0{selected + 1}</p>
              <h2 id="product-cases-title">{product.name}</h2>
              <p className="resume-case-title">{product.title}</p>
              <p className="resume-case-summary">{product.summary}</p>
              <a className="resume-product-site" href={product.site} target="_blank" rel="noopener noreferrer">
                開啟產品網站 <ArrowUpRight aria-hidden="true" />
              </a>
              <details className="resume-case-details" key={product.id}>
                <summary>閱讀案例</summary>
                {product.details.map((detail) => (
                  <div key={detail.title}>
                    <strong>{detail.title}</strong>
                    <p>{detail.text}</p>
                  </div>
                ))}
              </details>
            </div>

            <div className="resume-device">
              <div className="resume-device-lid">
                <div className="resume-device-camera" aria-hidden="true" />
                <div className="resume-device-screen" id="resume-mac-screen">
                  <div
                    className="resume-screen-strip"
                    style={{ transform: `translateX(-${selected * 100}%)` }}
                    aria-hidden="true"
                  >
                    {RESUME_PRODUCTS.map((entry) => (
                      <div className="resume-screen-frame" style={productArt(entry.id)} key={entry.id}>
                        <span>{entry.name}</span>
                        <strong>{entry.display}</strong>
                        <small>{entry.caption}</small>
                      </div>
                    ))}
                  </div>
                  <div className="resume-live-screen" key={product.id}>
                    {product.preview ? (
                      <div className="resume-live-preview">
                        <Image src={product.preview} alt={`${product.name} 網站預覽`} fill sizes="(max-width: 767px) 94vw, 740px" />
                      </div>
                    ) : nearStudio && (
                      <iframe
                        title={`${product.name} 即時網站`}
                        src={product.site}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                        referrerPolicy="strict-origin-when-cross-origin"
                        inert
                        tabIndex={-1}
                      />
                    )}
                  </div>
                </div>
                <div className="resume-device-hinge" aria-hidden="true" />
              </div>
              <div className="resume-device-base" aria-hidden="true">
                <div className="resume-device-keys">
                  {keyboardRows.map((row, rowIndex) => (
                    <div className="resume-device-key-row" data-row={rowIndex === 0 ? "fn" : undefined} key={row[0].id}>
                      {row.map((key) => (
                        <i
                          className="resume-device-key"
                          data-size={key.size}
                          data-homing={key.id === "f" || key.id === "j" ? "" : undefined}
                          key={key.id}
                        >
                          {key.sub ? <small>{key.sub}</small> : null}
                          {key.label ? <span>{key.label}</span> : null}
                        </i>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="resume-device-trackpad" />
              </div>
            </div>

            <div className="resume-project-dock" role="group" aria-label="選擇產品案例">
              {RESUME_PRODUCTS.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  <span style={productArt(entry.id)} aria-hidden="true" />
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
