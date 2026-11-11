export const SUPPORTED_LOCALES = ["zh-Hant"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type ContentHeaderSectionId =
  | "hero"
  | "job-desk"
  | "product-cases"
  | "proposal";

export interface SiteProfileAssets {
  readonly email: string;
  readonly resumePdfHref: string;
  readonly targetCompanyUrl: string;
  readonly badgePortraitSrc: string;
  readonly badgeClipSrc: string;
}

export interface SiteExperienceAsset {
  readonly logoSrc?: string;
  readonly fallbackMark: string;
}

export interface SiteProductAsset {
  readonly siteUrl: string;
  readonly artSrc: string;
  readonly previewSrc?: string;
}

export interface SiteSharedConfig {
  readonly defaultLocale: SupportedLocale;
  readonly profile: SiteProfileAssets;
  readonly experiences: Readonly<Record<string, SiteExperienceAsset>>;
  readonly products: Readonly<Record<string, SiteProductAsset>>;
}

export interface SiteMetadataContent {
  readonly title: string;
  readonly description: string;
}

export type HeaderNavLabels = Readonly<Record<ContentHeaderSectionId, string>>;

export interface HeaderContent {
  readonly wordmark: string;
  readonly navAriaLabel: string;
  readonly nav: HeaderNavLabels;
  readonly resumePdfLabel: string;
}

export interface CommonContent {
  readonly metadata: SiteMetadataContent;
  readonly header: HeaderContent;
}

export interface HeroCoverContent {
  readonly eyebrow: string;
  readonly headline: string;
  readonly tagline: string;
  readonly positioning: string;
  readonly summary: string;
  readonly watermark: string;
  readonly sectionNavAriaLabel: string;
  readonly experienceLinkLabel: string;
  readonly productsLinkLabel: string;
}

export interface HeroBadgeFrontContent {
  readonly topLabel: string;
  readonly numberLabel: string;
  readonly name: string;
  readonly role: string;
}

export interface HeroBadgeBackContent {
  readonly topLabel: string;
  readonly numberLabel: string;
  readonly name: string;
  readonly positioning: string;
  readonly emailLabel: string;
  readonly resumeLabel: string;
  readonly openPdfLabel: string;
  readonly signature: string;
}

export interface HeroBadgeContent {
  readonly groupAriaLabel: string;
  readonly strapText: string;
  readonly flipToFrontAriaLabel: string;
  readonly flipToBackAriaLabel: string;
  readonly front: HeroBadgeFrontContent;
  readonly back: HeroBadgeBackContent;
}

export interface HeroContent {
  readonly cover: HeroCoverContent;
  readonly badge: HeroBadgeContent;
}

export interface ExperienceItem {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly period: string;
  readonly bullets: readonly string[];
  readonly logoSrc?: string;
  readonly fallbackMark: string;
}

export interface ExperienceSectionContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly watermark: string;
  readonly nextSectionLabel: string;
  readonly showFrontLabel: string;
  readonly showAllDetailsLabel: string;
  readonly frontCardLabel: string;
  readonly backCardLabel: string;
  readonly cardFlipToFrontAriaTemplate: string;
  readonly cardFlipToBackAriaTemplate: string;
  readonly items: readonly ExperienceItem[];
}

export interface ProductCaseDetail {
  readonly title: string;
  readonly text: string;
}

export interface ProductCaseItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly title: string;
  readonly summary: string;
  readonly display: string;
  readonly caption: string;
  readonly details: readonly ProductCaseDetail[];
  readonly siteUrl: string;
  readonly artSrc: string;
  readonly previewSrc?: string;
}

export interface ProductsSectionContent {
  readonly eyebrowPrefix: string;
  readonly openSiteLabel: string;
  readonly readCaseLabel: string;
  readonly previewAltTemplate: string;
  readonly liveSiteTitleTemplate: string;
  readonly dockAriaLabel: string;
  readonly items: readonly ProductCaseItem[];
}

export interface ProposalIntroContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly startCtaLabel: string;
}

export interface ProposalTrailContent {
  readonly stopsAriaLabel: string;
  readonly markerAriaTemplate: string;
  readonly prevTopicAriaTemplate: string;
  readonly nextTopicAriaTemplate: string;
  readonly introAriaLabel: string;
  readonly finishAriaLabel: string;
}

export interface ProposalWaypointBullet {
  readonly title: string;
  readonly text: string;
}

export interface ProposalWaypointItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly bullets: readonly ProposalWaypointBullet[];
}

export interface ProposalFinishContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly backToTopLabel: string;
  readonly contactLabel: string;
}

export interface ProposalSectionContent {
  readonly intro: ProposalIntroContent;
  readonly trail: ProposalTrailContent;
  readonly waypoints: readonly ProposalWaypointItem[];
  readonly finish: ProposalFinishContent;
}

export interface SiteContent {
  readonly locale: SupportedLocale;
  readonly site: SiteSharedConfig;
  readonly common: CommonContent;
  readonly hero: HeroContent;
  readonly experience: ExperienceSectionContent;
  readonly products: ProductsSectionContent;
  readonly proposal: ProposalSectionContent;
}

export interface RawLocaleBundleInput {
  readonly common: unknown;
  readonly hero: unknown;
  readonly experience: unknown;
  readonly products: unknown;
  readonly proposal: unknown;
}

export interface RawSiteContentInput {
  readonly locale: unknown;
  readonly site: unknown;
  readonly bundle: RawLocaleBundleInput;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

const RESERVED_DOM_ANCHOR_IDS: ReadonlySet<string> = new Set([
  "profile",
  "hero",
  "job-desk",
  "product-cases",
  "proposal",
  "proposal-finish",
  "profile-title",
  "job-desk-title",
  "product-cases-title",
  "proposal-title",
  "resume-mac-screen",
]);

function assertRecord(
  value: unknown,
  path: string
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be a non-null object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function assertArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value;
}

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }
  return value;
}

function assertSupportedLocale(value: unknown, path: string): SupportedLocale {
  if (
    typeof value !== "string" ||
    !(SUPPORTED_LOCALES as readonly string[]).includes(value)
  ) {
    throw new Error(
      `${path} must be one of: ${SUPPORTED_LOCALES.join(", ")}`
    );
  }
  return value as SupportedLocale;
}

function assertSlug(value: unknown, path: string): string {
  const text = assertNonEmptyString(value, path);
  if (!SLUG_PATTERN.test(text)) {
    throw new Error(`${path} must be a lowercase kebab-case identifier`);
  }
  return text;
}

function assertEmail(value: unknown, path: string): string {
  const text = assertNonEmptyString(value, path);
  if (!EMAIL_PATTERN.test(text)) {
    throw new Error(`${path} must be a valid email address`);
  }
  return text;
}

function assertAssetPath(value: unknown, path: string): string {
  const text = assertNonEmptyString(value, path);
  if (!text.startsWith("/") || text.startsWith("//") || /\s/.test(text)) {
    throw new Error(`${path} must be a root-relative asset path starting with '/'`);
  }
  return text;
}

function assertOptionalAssetPath(
  value: unknown,
  path: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return assertAssetPath(value, path);
}

function assertHttpUrl(value: unknown, path: string): string {
  const text = assertNonEmptyString(value, path);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error(`${path} must be a valid HTTP or HTTPS URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${path} must use http or https protocol`);
  }
  return text;
}

function assertTemplatePlaceholders(
  value: unknown,
  requiredTokens: readonly string[],
  path: string
): string {
  const template = assertNonEmptyString(value, path);
  const foundTokens = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    foundTokens.add(match[1]);
  }
  for (const token of requiredTokens) {
    if (!foundTokens.has(token)) {
      throw new Error(`${path} must include placeholder {${token}}`);
    }
  }
  for (const token of foundTokens) {
    if (!requiredTokens.includes(token)) {
      throw new Error(`${path} contains unsupported placeholder {${token}}`);
    }
  }
  return template;
}

function assertMatchingKeySet(
  localeIds: readonly string[],
  sharedMap: Readonly<Record<string, unknown>>,
  sectionName: string
): void {
  const seen = new Set<string>();
  for (const id of localeIds) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${sectionName} id: ${id}`);
    }
    seen.add(id);
    if (!Object.prototype.hasOwnProperty.call(sharedMap, id)) {
      throw new Error(
        `Missing site.${sectionName} entry for locale item id: ${id}`
      );
    }
  }

  for (const sharedId of Object.keys(sharedMap)) {
    if (!seen.has(sharedId)) {
      throw new Error(
        `Orphan site.${sectionName} entry has no matching locale item: ${sharedId}`
      );
    }
  }
}

function parseSiteSharedConfig(raw: unknown): SiteSharedConfig {
  const root = assertRecord(raw, "site");
  const profileRaw = assertRecord(root.profile, "site.profile");
  const experiencesRaw = assertRecord(root.experiences, "site.experiences");
  const productsRaw = assertRecord(root.products, "site.products");

  const experiences: Record<string, SiteExperienceAsset> = {};
  for (const [key, entryRaw] of Object.entries(experiencesRaw)) {
    assertSlug(key, `site.experiences key '${key}'`);
    const entry = assertRecord(entryRaw, `site.experiences.${key}`);
    const logoSrc = assertOptionalAssetPath(
      entry.logoSrc,
      `site.experiences.${key}.logoSrc`
    );
    const fallbackMark = assertNonEmptyString(
      entry.fallbackMark,
      `site.experiences.${key}.fallbackMark`
    );
    experiences[key] = logoSrc !== undefined ? { logoSrc, fallbackMark } : { fallbackMark };
  }

  const products: Record<string, SiteProductAsset> = {};
  for (const [key, entryRaw] of Object.entries(productsRaw)) {
    assertSlug(key, `site.products key '${key}'`);
    const entry = assertRecord(entryRaw, `site.products.${key}`);
    const siteUrl = assertHttpUrl(entry.siteUrl, `site.products.${key}.siteUrl`);
    const artSrc = assertAssetPath(entry.artSrc, `site.products.${key}.artSrc`);
    const previewSrc = assertOptionalAssetPath(
      entry.previewSrc,
      `site.products.${key}.previewSrc`
    );
    products[key] =
      previewSrc !== undefined ? { siteUrl, artSrc, previewSrc } : { siteUrl, artSrc };
  }

  return {
    defaultLocale: assertSupportedLocale(root.defaultLocale, "site.defaultLocale"),
    profile: {
      email: assertEmail(profileRaw.email, "site.profile.email"),
      resumePdfHref: assertAssetPath(
        profileRaw.resumePdfHref,
        "site.profile.resumePdfHref"
      ),
      targetCompanyUrl: assertHttpUrl(
        profileRaw.targetCompanyUrl,
        "site.profile.targetCompanyUrl"
      ),
      badgePortraitSrc: assertAssetPath(
        profileRaw.badgePortraitSrc,
        "site.profile.badgePortraitSrc"
      ),
      badgeClipSrc: assertAssetPath(
        profileRaw.badgeClipSrc,
        "site.profile.badgeClipSrc"
      ),
    },
    experiences,
    products,
  };
}

function parseCommonContent(raw: unknown): CommonContent {
  const root = assertRecord(raw, "common");
  const metadata = assertRecord(root.metadata, "common.metadata");
  const header = assertRecord(root.header, "common.header");
  const nav = assertRecord(header.nav, "common.header.nav");

  return {
    metadata: {
      title: assertNonEmptyString(metadata.title, "common.metadata.title"),
      description: assertNonEmptyString(
        metadata.description,
        "common.metadata.description"
      ),
    },
    header: {
      wordmark: assertNonEmptyString(header.wordmark, "common.header.wordmark"),
      navAriaLabel: assertNonEmptyString(
        header.navAriaLabel,
        "common.header.navAriaLabel"
      ),
      nav: {
        hero: assertNonEmptyString(nav.hero, "common.header.nav.hero"),
        "job-desk": assertNonEmptyString(
          nav["job-desk"],
          "common.header.nav.job-desk"
        ),
        "product-cases": assertNonEmptyString(
          nav["product-cases"],
          "common.header.nav.product-cases"
        ),
        proposal: assertNonEmptyString(
          nav.proposal,
          "common.header.nav.proposal"
        ),
      },
      resumePdfLabel: assertNonEmptyString(
        header.resumePdfLabel,
        "common.header.resumePdfLabel"
      ),
    },
  };
}

function parseHeroContent(raw: unknown): HeroContent {
  const root = assertRecord(raw, "hero");
  const cover = assertRecord(root.cover, "hero.cover");
  const badge = assertRecord(root.badge, "hero.badge");
  const front = assertRecord(badge.front, "hero.badge.front");
  const back = assertRecord(badge.back, "hero.badge.back");

  return {
    cover: {
      eyebrow: assertNonEmptyString(cover.eyebrow, "hero.cover.eyebrow"),
      headline: assertNonEmptyString(cover.headline, "hero.cover.headline"),
      tagline: assertNonEmptyString(cover.tagline, "hero.cover.tagline"),
      positioning: assertNonEmptyString(
        cover.positioning,
        "hero.cover.positioning"
      ),
      summary: assertNonEmptyString(cover.summary, "hero.cover.summary"),
      watermark: assertNonEmptyString(cover.watermark, "hero.cover.watermark"),
      sectionNavAriaLabel: assertNonEmptyString(
        cover.sectionNavAriaLabel,
        "hero.cover.sectionNavAriaLabel"
      ),
      experienceLinkLabel: assertNonEmptyString(
        cover.experienceLinkLabel,
        "hero.cover.experienceLinkLabel"
      ),
      productsLinkLabel: assertNonEmptyString(
        cover.productsLinkLabel,
        "hero.cover.productsLinkLabel"
      ),
    },
    badge: {
      groupAriaLabel: assertNonEmptyString(
        badge.groupAriaLabel,
        "hero.badge.groupAriaLabel"
      ),
      strapText: assertNonEmptyString(badge.strapText, "hero.badge.strapText"),
      flipToFrontAriaLabel: assertNonEmptyString(
        badge.flipToFrontAriaLabel,
        "hero.badge.flipToFrontAriaLabel"
      ),
      flipToBackAriaLabel: assertNonEmptyString(
        badge.flipToBackAriaLabel,
        "hero.badge.flipToBackAriaLabel"
      ),
      front: {
        topLabel: assertNonEmptyString(
          front.topLabel,
          "hero.badge.front.topLabel"
        ),
        numberLabel: assertNonEmptyString(
          front.numberLabel,
          "hero.badge.front.numberLabel"
        ),
        name: assertNonEmptyString(front.name, "hero.badge.front.name"),
        role: assertNonEmptyString(front.role, "hero.badge.front.role"),
      },
      back: {
        topLabel: assertNonEmptyString(
          back.topLabel,
          "hero.badge.back.topLabel"
        ),
        numberLabel: assertNonEmptyString(
          back.numberLabel,
          "hero.badge.back.numberLabel"
        ),
        name: assertNonEmptyString(back.name, "hero.badge.back.name"),
        positioning: assertNonEmptyString(
          back.positioning,
          "hero.badge.back.positioning"
        ),
        emailLabel: assertNonEmptyString(
          back.emailLabel,
          "hero.badge.back.emailLabel"
        ),
        resumeLabel: assertNonEmptyString(
          back.resumeLabel,
          "hero.badge.back.resumeLabel"
        ),
        openPdfLabel: assertNonEmptyString(
          back.openPdfLabel,
          "hero.badge.back.openPdfLabel"
        ),
        signature: assertNonEmptyString(
          back.signature,
          "hero.badge.back.signature"
        ),
      },
    },
  };
}

function parseExperienceContent(
  raw: unknown,
  sharedExperiences: Readonly<Record<string, SiteExperienceAsset>>
): ExperienceSectionContent {
  const root = assertRecord(raw, "experience");
  const rawItems = assertArray(root.items, "experience.items");
  if (rawItems.length === 0) {
    throw new Error("experience.items must contain at least one entry");
  }

  const parsedLocaleItems = rawItems.map((itemRaw, index) => {
    const item = assertRecord(itemRaw, `experience.items[${index}]`);
    const rawBullets = assertArray(
      item.bullets,
      `experience.items[${index}].bullets`
    );
    if (rawBullets.length === 0) {
      throw new Error(
        `experience.items[${index}].bullets must contain at least one entry`
      );
    }
    const bullets = rawBullets.map((bulletRaw, bulletIndex) => {
      if (typeof bulletRaw !== "string" || bulletRaw.trim().length === 0) {
        throw new Error(
          `experience.items[${index}].bullets[${bulletIndex}] must be a non-empty string`
        );
      }
      return bulletRaw;
    });

    return {
      id: assertSlug(item.id, `experience.items[${index}].id`),
      company: assertNonEmptyString(
        item.company,
        `experience.items[${index}].company`
      ),
      role: assertNonEmptyString(item.role, `experience.items[${index}].role`),
      period: assertNonEmptyString(
        item.period,
        `experience.items[${index}].period`
      ),
      bullets,
    };
  });

  assertMatchingKeySet(
    parsedLocaleItems.map((item) => item.id),
    sharedExperiences,
    "experiences"
  );

  const items: ExperienceItem[] = parsedLocaleItems.map((item) => {
    const asset = sharedExperiences[item.id];
    return asset.logoSrc !== undefined
      ? { ...item, logoSrc: asset.logoSrc, fallbackMark: asset.fallbackMark }
      : { ...item, fallbackMark: asset.fallbackMark };
  });

  return {
    eyebrow: assertNonEmptyString(root.eyebrow, "experience.eyebrow"),
    title: assertNonEmptyString(root.title, "experience.title"),
    watermark: assertNonEmptyString(root.watermark, "experience.watermark"),
    nextSectionLabel: assertNonEmptyString(
      root.nextSectionLabel,
      "experience.nextSectionLabel"
    ),
    showFrontLabel: assertNonEmptyString(
      root.showFrontLabel,
      "experience.showFrontLabel"
    ),
    showAllDetailsLabel: assertNonEmptyString(
      root.showAllDetailsLabel,
      "experience.showAllDetailsLabel"
    ),
    frontCardLabel: assertNonEmptyString(
      root.frontCardLabel,
      "experience.frontCardLabel"
    ),
    backCardLabel: assertNonEmptyString(
      root.backCardLabel,
      "experience.backCardLabel"
    ),
    cardFlipToFrontAriaTemplate: assertTemplatePlaceholders(
      root.cardFlipToFrontAriaTemplate,
      ["company"],
      "experience.cardFlipToFrontAriaTemplate"
    ),
    cardFlipToBackAriaTemplate: assertTemplatePlaceholders(
      root.cardFlipToBackAriaTemplate,
      ["company"],
      "experience.cardFlipToBackAriaTemplate"
    ),
    items,
  };
}

function parseProductsContent(
  raw: unknown,
  sharedProducts: Readonly<Record<string, SiteProductAsset>>
): ProductsSectionContent {
  const root = assertRecord(raw, "products");
  const rawItems = assertArray(root.items, "products.items");
  if (rawItems.length === 0) {
    throw new Error("products.items must contain at least one entry");
  }

  const parsedLocaleItems = rawItems.map((itemRaw, index) => {
    const item = assertRecord(itemRaw, `products.items[${index}]`);
    const rawDetails = assertArray(
      item.details,
      `products.items[${index}].details`
    );
    const details: ProductCaseDetail[] = rawDetails.map(
      (detailRaw, detailIndex) => {
        const detail = assertRecord(
          detailRaw,
          `products.items[${index}].details[${detailIndex}]`
        );
        if (
          typeof detail.title !== "string" ||
          detail.title.trim().length === 0
        ) {
          throw new Error(
            `products.items[${index}].details[${detailIndex}].title must be a non-empty string`
          );
        }
        if (
          typeof detail.text !== "string" ||
          detail.text.trim().length === 0
        ) {
          throw new Error(
            `products.items[${index}].details[${detailIndex}].text must be a non-empty string`
          );
        }
        return {
          title: detail.title,
          text: detail.text,
        };
      }
    );

    return {
      id: assertSlug(item.id, `products.items[${index}].id`),
      name: assertNonEmptyString(item.name, `products.items[${index}].name`),
      category: assertNonEmptyString(
        item.category,
        `products.items[${index}].category`
      ),
      title: assertNonEmptyString(item.title, `products.items[${index}].title`),
      summary: assertNonEmptyString(
        item.summary,
        `products.items[${index}].summary`
      ),
      display: assertNonEmptyString(
        item.display,
        `products.items[${index}].display`
      ),
      caption: assertNonEmptyString(
        item.caption,
        `products.items[${index}].caption`
      ),
      details,
    };
  });

  assertMatchingKeySet(
    parsedLocaleItems.map((item) => item.id),
    sharedProducts,
    "products"
  );

  const items: ProductCaseItem[] = parsedLocaleItems.map((item) => {
    const asset = sharedProducts[item.id];
    return asset.previewSrc !== undefined
      ? {
          ...item,
          siteUrl: asset.siteUrl,
          artSrc: asset.artSrc,
          previewSrc: asset.previewSrc,
        }
      : {
          ...item,
          siteUrl: asset.siteUrl,
          artSrc: asset.artSrc,
        };
  });

  return {
    eyebrowPrefix: assertNonEmptyString(
      root.eyebrowPrefix,
      "products.eyebrowPrefix"
    ),
    openSiteLabel: assertNonEmptyString(
      root.openSiteLabel,
      "products.openSiteLabel"
    ),
    readCaseLabel: assertNonEmptyString(
      root.readCaseLabel,
      "products.readCaseLabel"
    ),
    previewAltTemplate: assertTemplatePlaceholders(
      root.previewAltTemplate,
      ["name"],
      "products.previewAltTemplate"
    ),
    liveSiteTitleTemplate: assertTemplatePlaceholders(
      root.liveSiteTitleTemplate,
      ["name"],
      "products.liveSiteTitleTemplate"
    ),
    dockAriaLabel: assertNonEmptyString(
      root.dockAriaLabel,
      "products.dockAriaLabel"
    ),
    items,
  };
}

function parseProposalContent(raw: unknown): ProposalSectionContent {
  const root = assertRecord(raw, "proposal");
  const intro = assertRecord(root.intro, "proposal.intro");
  const trail = assertRecord(root.trail, "proposal.trail");
  const finish = assertRecord(root.finish, "proposal.finish");
  const rawWaypoints = assertArray(root.waypoints, "proposal.waypoints");

  if (rawWaypoints.length < 2) {
    throw new Error("proposal.waypoints must contain at least 2 waypoints");
  }

  const seenIds = new Set<string>();
  const waypoints: ProposalWaypointItem[] = rawWaypoints.map(
    (waypointRaw, index) => {
      const waypoint = assertRecord(waypointRaw, `proposal.waypoints[${index}]`);
      const id = assertSlug(waypoint.id, `proposal.waypoints[${index}].id`);
      if (RESERVED_DOM_ANCHOR_IDS.has(id)) {
        throw new Error(
          `proposal.waypoints[${index}].id '${id}' collides with a reserved page anchor id`
        );
      }
      if (seenIds.has(id)) {
        throw new Error(`Duplicate proposal waypoint id: ${id}`);
      }
      seenIds.add(id);

      if (
        typeof waypoint.title !== "string" ||
        waypoint.title.trim().length === 0
      ) {
        throw new Error(
          `proposal.waypoints[${index}].title must be a non-empty string`
        );
      }
      if (
        typeof waypoint.subtitle !== "string" ||
        waypoint.subtitle.trim().length === 0
      ) {
        throw new Error(
          `proposal.waypoints[${index}].subtitle must be a non-empty string`
        );
      }

      const rawBullets = assertArray(
        waypoint.bullets,
        `proposal.waypoints[${index}].bullets`
      );
      if (rawBullets.length === 0) {
        throw new Error(
          `proposal.waypoints[${index}].bullets must contain at least one entry`
        );
      }
      const bullets: ProposalWaypointBullet[] = rawBullets.map(
        (bulletRaw, bulletIndex) => {
          const bullet = assertRecord(
            bulletRaw,
            `proposal.waypoints[${index}].bullets[${bulletIndex}]`
          );
          if (
            typeof bullet.title !== "string" ||
            bullet.title.trim().length === 0
          ) {
            throw new Error(
              `proposal.waypoints[${index}].bullets[${bulletIndex}].title must be a non-empty string`
            );
          }
          if (
            typeof bullet.text !== "string" ||
            bullet.text.trim().length === 0
          ) {
            throw new Error(
              `proposal.waypoints[${index}].bullets[${bulletIndex}].text must be a non-empty string`
            );
          }
          return {
            title: bullet.title,
            text: bullet.text,
          };
        }
      );

      return {
        id,
        title: waypoint.title,
        subtitle: waypoint.subtitle,
        bullets,
      };
    }
  );

  return {
    intro: {
      eyebrow: assertNonEmptyString(intro.eyebrow, "proposal.intro.eyebrow"),
      title: assertNonEmptyString(intro.title, "proposal.intro.title"),
      subtitle: assertNonEmptyString(intro.subtitle, "proposal.intro.subtitle"),
      startCtaLabel: assertNonEmptyString(
        intro.startCtaLabel,
        "proposal.intro.startCtaLabel"
      ),
    },
    trail: {
      stopsAriaLabel: assertNonEmptyString(
        trail.stopsAriaLabel,
        "proposal.trail.stopsAriaLabel"
      ),
      markerAriaTemplate: assertTemplatePlaceholders(
        trail.markerAriaTemplate,
        ["step", "title"],
        "proposal.trail.markerAriaTemplate"
      ),
      prevTopicAriaTemplate: assertTemplatePlaceholders(
        trail.prevTopicAriaTemplate,
        ["title"],
        "proposal.trail.prevTopicAriaTemplate"
      ),
      nextTopicAriaTemplate: assertTemplatePlaceholders(
        trail.nextTopicAriaTemplate,
        ["title"],
        "proposal.trail.nextTopicAriaTemplate"
      ),
      introAriaLabel: assertNonEmptyString(
        trail.introAriaLabel,
        "proposal.trail.introAriaLabel"
      ),
      finishAriaLabel: assertNonEmptyString(
        trail.finishAriaLabel,
        "proposal.trail.finishAriaLabel"
      ),
    },
    waypoints,
    finish: {
      eyebrow: assertNonEmptyString(finish.eyebrow, "proposal.finish.eyebrow"),
      title: assertNonEmptyString(finish.title, "proposal.finish.title"),
      backToTopLabel: assertNonEmptyString(
        finish.backToTopLabel,
        "proposal.finish.backToTopLabel"
      ),
      contactLabel: assertNonEmptyString(
        finish.contactLabel,
        "proposal.finish.contactLabel"
      ),
    },
  };
}

/**
 * Validates raw JSON site config and locale dictionaries, enforcing both
 * syntactic field constraints and cross-file reference integrity.
 */
export function parseSiteContent(input: RawSiteContentInput): SiteContent {
  const locale = assertSupportedLocale(input.locale, "locale");
  const site = parseSiteSharedConfig(input.site);
  const bundle = assertRecord(input.bundle, "bundle");

  return {
    locale,
    site,
    common: parseCommonContent(bundle.common),
    hero: parseHeroContent(bundle.hero),
    experience: parseExperienceContent(bundle.experience, site.experiences),
    products: parseProductsContent(bundle.products, site.products),
    proposal: parseProposalContent(bundle.proposal),
  };
}

/**
 * Formats a validated copy template (e.g. `"{name} 網站預覽"`) by substituting
 * named `{placeholder}` tokens. Throws immediately if a placeholder value is missing.
 */
export function formatContentTemplate(
  template: string,
  variables: Readonly<Record<string, string | number>>
): string {
  return template.replace(PLACEHOLDER_PATTERN, (_match, token: string) => {
    if (!Object.prototype.hasOwnProperty.call(variables, token)) {
      throw new Error(`Missing template variable '${token}' for '${template}'`);
    }
    const value = String(variables[token]);
    if (value.trim().length === 0) {
      throw new Error(`Template variable '${token}' must not be empty`);
    }
    return value;
  });
}
