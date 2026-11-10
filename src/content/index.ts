import rawSite from "./site.json";
import zhHantCommon from "./locales/zh-Hant/common.json";
import zhHantExperience from "./locales/zh-Hant/experience.json";
import zhHantHero from "./locales/zh-Hant/hero.json";
import zhHantProducts from "./locales/zh-Hant/products.json";
import zhHantProposal from "./locales/zh-Hant/proposal.json";
import {
  parseSiteContent,
  SUPPORTED_LOCALES,
  type RawLocaleBundleInput,
  type SiteContent,
  type SupportedLocale,
} from "./schema";

export * from "./schema";

const RAW_LOCALE_BUNDLES: Readonly<Record<SupportedLocale, RawLocaleBundleInput>> = {
  "zh-Hant": {
    common: zhHantCommon,
    hero: zhHantHero,
    experience: zhHantExperience,
    products: zhHantProducts,
    proposal: zhHantProposal,
  },
};

const VALIDATED_CONTENT_BY_LOCALE: Readonly<Record<SupportedLocale, SiteContent>> = {
  "zh-Hant": parseSiteContent({
    locale: "zh-Hant",
    site: rawSite,
    bundle: RAW_LOCALE_BUNDLES["zh-Hant"],
  }),
};

export const DEFAULT_LOCALE: SupportedLocale =
  VALIDATED_CONTENT_BY_LOCALE["zh-Hant"].site.defaultLocale;

/**
 * Returns the validated website content dictionary for the requested locale
 * (defaulting to `DEFAULT_LOCALE`, currently `"zh-Hant"`).
 */
export function getSiteContent(
  locale: SupportedLocale = DEFAULT_LOCALE
): SiteContent {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`Unsupported locale: ${String(locale)}`);
  }
  return VALIDATED_CONTENT_BY_LOCALE[locale];
}
