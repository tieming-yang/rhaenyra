"use client";

import Image from "next/image";
import { Layers } from "lucide-react";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { RESUME_BADGES } from "@/domain/resume-showcase-data";

const logos: Readonly<Record<string, string>> = {
  beacon: "/resume/jobs/beacon.webp",
  "thinker-data": "/resume/jobs/thinker-data.png",
  "eternal-story": "/resume/jobs/eternal-story.png",
  "youtube-creator": "/resume/jobs/youtube-creator.svg",
  tvbs: "/resume/jobs/tvbs.svg",
  dentall: "/resume/jobs/dentall.svg",
  bole: "/resume/jobs/bole.png",
  nuturefit: "/resume/jobs/nuturefit.png",
};

const marks: Readonly<Record<string, string>> = {
  beacon: "B",
  "thinker-data": "TD",
  "eternal-story": "ES",
  "youtube-creator": "YT",
  tvbs: "TV",
  dentall: "dt",
  bole: "博樂",
  nuturefit: "NF",
  "houston-teaching": "HT",
  "taiwan-teaching": "臺灣",
};

export function ResumeJobDeck() {
  const listRef = useRef<HTMLOListElement>(null);
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const [flipDelays, setFlipDelays] = useState<ReadonlyMap<string, number>>(new Map());
  const allFlipped = flipped.size === RESUME_BADGES.length;

  function flipAll() {
    const slots = Array.from(listRef.current?.children ?? []);
    const positions = slots.map((slot) => {
      const { left, top } = slot.getBoundingClientRect();
      return { id: slot.id, distance: left + top * 0.35 };
    });
    positions.sort((a, b) => a.distance - b.distance);
    setFlipDelays(new Map(positions.map(({ id }, index) => [id, index * 38])));
    setFlipped(new Set(allFlipped ? [] : RESUME_BADGES.map((job) => job.id)));
  }

  function flip(id: string) {
    setFlipDelays(new Map());
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const alignStack = () => {
      const slots = [...list.children] as HTMLElement[];
      for (const slot of slots) {
        slot.style.setProperty("--gather-x", `${(list.clientWidth - slot.offsetWidth) / 2 - slot.offsetLeft}px`);
        slot.style.setProperty("--gather-y", `${list.clientHeight * 0.38 - slot.offsetHeight / 2 - slot.offsetTop}px`);
      }
    };
    const observer = new ResizeObserver(alignStack);
    observer.observe(list);
    alignStack();

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="resume-desk-header">
        <div>
          <p className="resume-eyebrow">02 / WORK & INTERNSHIPS</p>
          <h2 id="job-desk-title">工作與實習名牌</h2>
        </div>
        <div className="resume-deck-controls">
          <button type="button" onClick={flipAll} aria-pressed={allFlipped}>
            <Layers aria-hidden="true" /> {allFlipped ? "顯示正面" : "顯示全部詳情"}
          </button>
        </div>
      </header>

      <ol
        className="resume-job-deck grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        ref={listRef}
      >
        {RESUME_BADGES.map((job, index) => {
          const isFlipped = flipped.has(job.id);
          const number = index + 1;
          const face = `job-${job.id}-${isFlipped ? "back" : "front"}`;
          const slot = `job-card-${job.id}`;

          return (
            <li
              className="resume-job-slot w-full max-w-[19.5rem] mx-auto sm:max-w-none"
              id={slot}
              key={job.id}
              style={{ "--flip-delay": `${flipDelays.get(slot) ?? 0}ms` } as CSSProperties}
            >
              <div className="resume-job-placement">
                <button
                  className="resume-job-button"
                  type="button"
                  aria-label={isFlipped ? `顯示 ${job.company} 的名牌正面` : `翻看 ${job.company} 的經歷`}
                  aria-describedby={face}
                  aria-pressed={isFlipped}
                  onClick={() => flip(job.id)}
                >
                  <span className="resume-job-flip" data-flipped={isFlipped ? "" : undefined}>
                    <span
                      className="resume-job-face resume-job-front"
                      data-tone={number % 5}
                      id={`job-${job.id}-front`}
                      aria-hidden={isFlipped}
                    >
                      <span className="resume-job-num">EXPERIENCE <span>{String(number).padStart(2, "0")}</span></span>
                      <span className="resume-job-mark" aria-hidden="true">
                        {logos[job.id] ? (
                          <Image
                            className="resume-job-logo"
                            src={logos[job.id]}
                            alt=""
                            width={128}
                            height={128}
                            draggable={false}
                          />
                        ) : (
                          marks[job.id]
                        )}
                      </span>
                      <span className="resume-job-name">{job.company}</span>
                      <span className="resume-job-role">{job.role}</span>
                    </span>
                    <span className="resume-job-face resume-job-back" id={`job-${job.id}-back`} aria-hidden={!isFlipped}>
                      <span className="resume-job-num">WORK HISTORY <span>{String(number).padStart(2, "0")}</span></span>
                      <span className="resume-job-name">{job.company}</span>
                      <span className="resume-job-period">{job.period}</span>
                      <span className="resume-job-note">{job.note}</span>
                    </span>
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
