"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";
import { RESUME_PRODUCTS } from "@/domain/resume-showcase-data";
import { ResumeBadge } from "./resume-badge";
import { ResumeJobDeck } from "./resume-job-deck";

const keyboardKeys = Array.from({ length: 51 }, (_, index) => index);

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
      const deskBounds = desk.getBoundingClientRect();
      if (reduce.matches) {
        desk.style.removeProperty("--desk-close");
      } else {
        const exit = Math.min(1, Math.max(0, (viewport * 0.68 - deskBounds.bottom) / (viewport * 0.46)));
        desk.style.setProperty("--desk-close", String(exit));
      }
      for (const { element, entry, distance } of tracks) {
        if (reduce.matches) {
          element.style.removeProperty("--scene-progress");
          continue;
        }

        const top = element === desk ? deskBounds.top : element.getBoundingClientRect().top;
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
                <div className="resume-device-screen">
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
                <span className="resume-device-wordmark" aria-hidden="true">MacBook Pro</span>
              </div>
              <div className="resume-device-base" aria-hidden="true">
                <div className="resume-device-keys">{keyboardKeys.map((key) => <i key={key} />)}</div>
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
