"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileDown } from "lucide-react";
import type { HeaderContent } from "@/content";
import {
  buildHeaderNavItems,
  HEADER_SECTION_HASH,
  HEADER_SECTION_HREF,
  resolveActiveHeaderSection,
  resolveScrollUrlTransition,
  resolveSectionFromHash,
  type HeaderSection,
} from "@/lib/header-navigation";

interface InterviewHeaderProps {
  readonly content: HeaderContent;
  readonly resumePdfHref: string;
}

const PROGRAMMATIC_SCROLL_LOCK_MS = 1600;

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export function InterviewHeader({
  content,
  resumePdfHref,
}: InterviewHeaderProps) {
  const navItems = useMemo(
    () => buildHeaderNavItems(content.nav),
    [content.nav]
  );
  const [activeSection, setActiveSection] = useState<HeaderSection>("hero");
  const pendingSectionRef = useRef<HeaderSection | null>(null);
  const pendingUntilMsRef = useRef(0);
  const lastObservedHashRef = useRef("");

  const lockProgrammaticScroll = useCallback((section: HeaderSection) => {
    pendingSectionRef.current = section;
    pendingUntilMsRef.current = performance.now() + PROGRAMMATIC_SCROLL_LOCK_MS;
    setActiveSection((current) => (current === section ? current : section));
  }, []);

  const scrollToSection = useCallback(
    (section: HeaderSection) => {
      const targetHash = HEADER_SECTION_HASH[section];
      const nextUrl =
        section === "hero"
          ? `${window.location.pathname}${window.location.search}`
          : `${window.location.pathname}${window.location.search}${targetHash}`;

      const behavior = getPreferredScrollBehavior();

      lockProgrammaticScroll(section);

      if (window.location.hash !== targetHash) {
        window.history.pushState(null, "", nextUrl);
      }
      lastObservedHashRef.current = targetHash;

      if (section === "hero") {
        window.scrollTo({ top: 0, behavior });
        return;
      }

      const target = document.getElementById(section);
      target?.scrollIntoView({ behavior, block: "start" });
    },
    [lockProgrammaticScroll]
  );

  useEffect(() => {
    let frame = 0;
    let shouldSyncUrl = false;

    const measureSectionTop = (id: string): number | null => {
      const element = document.getElementById(id);
      return element ? element.getBoundingClientRect().top : null;
    };

    const update = () => {
      frame = 0;
      const syncUrl = shouldSyncUrl;
      shouldSyncUrl = false;

      const viewportHeight = window.innerHeight;
      if (viewportHeight <= 0) return;

      const currentHash = window.location.hash;
      if (currentHash !== lastObservedHashRef.current) {
        lastObservedHashRef.current = currentHash;
        const externalTarget = resolveSectionFromHash(currentHash);
        if (externalTarget !== null) {
          pendingSectionRef.current = externalTarget;
          pendingUntilMsRef.current =
            performance.now() + PROGRAMMATIC_SCROLL_LOCK_MS;
        }
      }

      const resolvedSection = resolveActiveHeaderSection(
        {
          jobDeskTop: measureSectionTop("job-desk"),
          productCasesTop: measureSectionTop("product-cases"),
          proposalTop: measureSectionTop("proposal"),
        },
        viewportHeight
      );

      const pendingSection = pendingSectionRef.current;
      if (pendingSection !== null) {
        if (
          resolvedSection === pendingSection ||
          performance.now() >= pendingUntilMsRef.current
        ) {
          pendingSectionRef.current = null;
        } else {
          setActiveSection((current) =>
            current === pendingSection ? current : pendingSection
          );
          return;
        }
      }

      setActiveSection((current) =>
        current === resolvedSection ? current : resolvedSection
      );

      if (!syncUrl) return;

      const transition = resolveScrollUrlTransition({
        activeSection: resolvedSection,
        pathname: window.location.pathname,
        search: window.location.search,
        currentHash: window.location.hash,
      });
      if (transition.kind === "replace") {
        window.history.replaceState(null, "", transition.nextUrl);
        lastObservedHashRef.current = window.location.hash;
      }
    };

    const schedule = (syncUrl: boolean) => {
      if (syncUrl) shouldSyncUrl = true;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const onScroll = () => schedule(true);
    const onResize = () => schedule(false);
    const onManualInput = () => {
      pendingSectionRef.current = null;
    };
    const onScrollEnd = () => {
      if (pendingSectionRef.current !== null) {
        pendingSectionRef.current = null;
        schedule(true);
      }
    };
    const onHashChange = () => {
      const currentHash = window.location.hash;
      lastObservedHashRef.current = currentHash;
      const target = resolveSectionFromHash(currentHash);
      if (target !== null) {
        lockProgrammaticScroll(target);
      } else {
        schedule(false);
      }
    };
    const onPopState = () => {
      const currentHash = window.location.hash;
      lastObservedHashRef.current = currentHash;
      const target = resolveSectionFromHash(currentHash);
      if (target === null) {
        schedule(false);
        return;
      }

      lockProgrammaticScroll(target);
      const behavior = getPreferredScrollBehavior();
      if (target === "hero") {
        window.scrollTo({ top: 0, behavior });
        return;
      }

      const targetId = currentHash.startsWith("#")
        ? currentHash.slice(1)
        : target;
      document.getElementById(targetId)?.scrollIntoView({
        behavior,
        block: "start",
      });
    };
    const onDocumentClick = (event: globalThis.MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest("a");
      if (!anchor) return;

      if (anchor.dataset.scrollSection === "hero") {
        event.preventDefault();
        scrollToSection("hero");
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (rawHref && rawHref.startsWith("#")) {
        const target = resolveSectionFromHash(rawHref);
        if (target !== null) {
          lastObservedHashRef.current = rawHref === "#" ? "" : rawHref;
          lockProgrammaticScroll(target);
        }
      }
    };

    lastObservedHashRef.current = window.location.hash;
    const initialSection = resolveSectionFromHash(window.location.hash);
    if (initialSection !== null && initialSection !== "hero") {
      pendingSectionRef.current = initialSection;
      pendingUntilMsRef.current =
        performance.now() + PROGRAMMATIC_SCROLL_LOCK_MS;
    }
    schedule(false);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    window.addEventListener("wheel", onManualInput, { passive: true });
    window.addEventListener("touchmove", onManualInput, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", onManualInput);
      window.removeEventListener("touchmove", onManualInput);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [lockProgrammaticScroll, scrollToSection]);

  function handleSectionClick(
    event: ReactMouseEvent<HTMLAnchorElement>,
    section: HeaderSection
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const targetId = section === "hero" ? null : section;
    if (targetId !== null && !document.getElementById(targetId)) {
      return;
    }

    event.preventDefault();
    scrollToSection(section);
  }

  return (
    <header className="interview-header">
      <div className="interview-header-inner">
        <a
          href={HEADER_SECTION_HREF.hero}
          onClick={(event) => handleSectionClick(event, "hero")}
          className="interview-wordmark"
        >
          {content.wordmark}
        </a>
        <nav className="interview-nav" aria-label={content.navAriaLabel}>
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={activeSection === item.id ? "location" : undefined}
              onClick={(event) => handleSectionClick(event, item.id)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href={resumePdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="interview-pdf"
        >
          <FileDown className="hidden size-4 sm:block" aria-hidden="true" />
          {content.resumePdfLabel}
        </a>
      </div>
    </header>
  );
}
