const BASE_URL = 'https://emotume.app';
const SITE_NAME = 'Emotume';
const DEFAULT_TITLE = 'Emotume - AI-Powered Emotional Chat Experience';
const DEFAULT_DESC = 'The world\'s first AI-powered emotional chat platform. Real-time emotion analysis, AI song suggestions, shayari, memory mesh, and intelligent conversations.';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const TWITTER_HANDLE = '@emotume';
const LOCALE = 'en_US';
const THEME_COLOR = '#0a0a1a';

export function buildMeta({
  title,
  description,
  canonical,
  keywords,
  author = 'Emotume',
  robots = 'index, follow',
  image = DEFAULT_IMAGE,
  imageAlt = 'Emotume preview',
  type = 'website',
  locale = LOCALE,
  publishedTime,
  modifiedTime,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const metaDescription = description || DEFAULT_DESC;
  const url = canonical || BASE_URL;
  const finalRobots = noIndex ? 'noindex, nofollow' : robots;

  return {
    title: fullTitle,
    meta: [
      { name: 'description', content: metaDescription },
      { name: 'keywords', content: keywords || '' },
      { name: 'author', content: author },
      { name: 'robots', content: finalRobots },
      { name: 'theme-color', content: THEME_COLOR },
      { name: 'application-name', content: SITE_NAME },
      { name: 'generator', content: 'Emotume v2.0' },

      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: metaDescription },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { property: 'og:image:alt', content: imageAlt },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: locale },
      ...(publishedTime ? [{ property: 'article:published_time', content: publishedTime }] : []),
      ...(modifiedTime ? [{ property: 'article:modified_time', content: modifiedTime }] : []),

      { name: 'twitter:card', content: type === 'article' ? 'summary_large_image' : 'summary_large_image' },
      { name: 'twitter:site', content: TWITTER_HANDLE },
      { name: 'twitter:creator', content: TWITTER_HANDLE },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: metaDescription },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: imageAlt },

      { name: 'linkedin:title', content: fullTitle },
      { name: 'linkedin:description', content: metaDescription },

      { name: 'telegram:title', content: fullTitle },
      { name: 'telegram:description', content: metaDescription },

      { name: 'whatsapp:title', content: fullTitle },
      { name: 'whatsapp:description', content: metaDescription },

      { name: 'discord:title', content: fullTitle },
      { name: 'discord:description', content: metaDescription },
    ],
    link: [
      ...(canonical ? [{ rel: 'canonical', href: url }] : []),
      { rel: 'alternate', hrefLang: 'en', href: url },
    ],
  };
}

export const siteConfig = {
  name: SITE_NAME,
  url: BASE_URL,
  defaultTitle: DEFAULT_TITLE,
  defaultDescription: DEFAULT_DESC,
  defaultImage: DEFAULT_IMAGE,
  twitterHandle: TWITTER_HANDLE,
  themeColor: THEME_COLOR,
  locale: LOCALE,
};
