"use client";

import { Layers, LayoutGrid, Shuffle } from "lucide-react";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { RESUME_BADGES } from "@/domain/resume-showcase-data";

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

interface DeckTransition {
  readonly kind: "shuffle" | "sort";
  readonly positions: ReadonlyMap<string, DOMRect>;
}

export function ResumeJobDeck() {
  const listRef = useRef<HTMLOListElement>(null);
  const transitionRef = useRef<DeckTransition | null>(null);
  const [order, setOrder] = useState(RESUME_BADGES);
  const [sorted, setSorted] = useState(false);
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const [flipDelays, setFlipDelays] = useState<ReadonlyMap<string, number>>(new Map());
  const allFlipped = flipped.size === RESUME_BADGES.length;

  function capture(kind: DeckTransition["kind"]) {
    const list = listRef.current;
    if (!list) return;

    transitionRef.current = {
      kind,
      positions: new Map([...list.children].map((item) => [item.id, item.getBoundingClientRect()])),
    };
  }

  function shuffle() {
    capture("shuffle");
    const next = [...order];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [next[index], next[swap]] = [next[swap], next[index]];
    }
    if (next.every((job, index) => job === order[index])) next.push(next.shift()!);
    setOrder(next);
    setSorted(false);
    setFlipDelays(new Map());
    setFlipped(new Set());
  }

  function sort() {
    capture("sort");
    if (!sorted) {
      setOrder(RESUME_BADGES);
      setFlipDelays(new Map());
      setFlipped(new Set());
    }
    setSorted(!sorted);
  }

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

    const slots = [...list.children] as HTMLElement[];
    const alignStack = () => {
      for (const slot of slots) {
        slot.style.setProperty("--gather-x", `${(list.clientWidth - slot.offsetWidth) / 2 - slot.offsetLeft}px`);
        slot.style.setProperty("--gather-y", `${list.clientHeight * 0.38 - slot.offsetHeight / 2 - slot.offsetTop}px`);
      }
    };
    const observer = new ResizeObserver(alignStack);
    observer.observe(list);
    alignStack();

    const transition = transitionRef.current;
    transitionRef.current = null;
    if (transition) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const deck = list.getBoundingClientRect();
      for (const [index, slot] of slots.entries()) {
        slot.getAnimations().forEach((animation) => animation.cancel());
        const before = transition.positions.get(slot.id);
        if (!before || reduced) continue;

        const after = slot.getBoundingClientRect();
        const from = `translate(${before.left - after.left}px, ${before.top - after.top}px)`;
        if (transition.kind === "sort") {
          slot.animate([{ transform: from }, { transform: "none" }], {
            duration: 480,
            easing: "cubic-bezier(.22,.75,.3,1)",
          });
          continue;
        }

        const center = Math.max(deck.top + after.height / 2, Math.min(innerHeight * 0.6, deck.bottom - after.height / 2));
        const stack = `translate(${deck.left + (deck.width - after.width) / 2 - after.left + index}px, ${center - after.height / 2 - after.top + index}px) rotate(${(index - 5) * 0.55}deg)`;
        slot.animate([
          { transform: from, offset: 0 },
          { transform: stack, offset: 0.28 },
          { transform: stack, offset: 0.73 },
          { transform: "none", offset: 1 },
        ], {
          duration: 1420 + index * 24,
          easing: "cubic-bezier(.3,.02,.27,1)",
        });
      }
    }

    return () => observer.disconnect();
  }, [order, sorted]);

  return (
    <>
      <header className="resume-desk-header">
        <div>
          <p className="resume-eyebrow">02 / WORK & INTERNSHIPS</p>
          <h2 id="job-desk-title">工作與實習名牌</h2>
        </div>
        <div className="resume-deck-controls" role="group" aria-label="名牌排列控制">
          <button type="button" onClick={flipAll} aria-pressed={allFlipped}>
            <Layers aria-hidden="true" /> {allFlipped ? "顯示正面" : "顯示全部詳情"}
          </button>
          <button type="button" onClick={shuffle}>
            <Shuffle aria-hidden="true" /> 洗牌
          </button>
          <button type="button" onClick={sort} aria-pressed={sorted}>
            <LayoutGrid aria-hidden="true" /> {sorted ? "散開" : "排序"}
          </button>
        </div>
      </header>

      <ol className="resume-job-deck" ref={listRef} data-sorted={sorted ? "" : undefined}>
        {order.map((job) => {
          const isFlipped = flipped.has(job.id);
          const number = RESUME_BADGES.indexOf(job) + 1;
          const face = `job-${job.id}-${isFlipped ? "back" : "front"}`;
          const slot = `job-card-${job.id}`;

          return (
            <li
              className="resume-job-slot"
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
                      <span className="resume-job-mark" aria-hidden="true">{marks[job.id]}</span>
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
