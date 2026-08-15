const BASE_URL = 'https://emotume.app';

export function OrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Emotume',
    url: BASE_URL,
    description: 'AI-Powered Emotional Chat Experience with real-time emotion analysis, song suggestions, shayari, and intelligent conversations.',
    logo: `${BASE_URL}/logo.png`,
    sameAs: [
      'https://twitter.com/emotume',
      'https://twitter.com/emotume',
    ],
    foundingDate: '2024',
    email: 'support@emotume.app',
  };
}

export function WebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Emotume',
    description: 'AI-Powered Emotional Chat Experience',
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function WebPageSchema({ title, description, url, datePublished, dateModified, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url || BASE_URL}/#webpage`,
    url: url || BASE_URL,
    name: title || 'Emotume',
    description: description || 'AI-Powered Emotional Chat Experience',
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(image && { primaryImageOfPage: { '@type': 'ImageObject', url: image } }),
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'en-US',
    isPartOf: { '@id': `${BASE_URL}/#website` },
    breadcrumb: { '@id': `${url || BASE_URL}/#breadcrumb` },
  };
}

export function BreadcrumbSchema({ items }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${BASE_URL}/#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url || `${BASE_URL}${item.path}`,
    })),
  };
}

export function SoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Emotume',
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'AI-Powered Emotional Chat Experience with real-time emotion analysis, song suggestions, shayari, and more.',
    url: BASE_URL,
    author: { '@id': `${BASE_URL}/#organization` },
  };
}

export function ArticleSchema({ headline, description, url, image, datePublished, dateModified, authorName = 'Emotume' }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url || BASE_URL}/#article`,
    headline,
    description,
    ...(url && { url }),
    ...(image && { image }),
    datePublished: datePublished || new Date().toISOString(),
    ...(dateModified && { dateModified }),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'en-US',
  };
}

export function FAQPageSchema({ questions }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/#faq`,
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

export function VideoObjectSchema({ name, description, thumbnailUrl, contentUrl, embedUrl, uploadDate, duration }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description,
    ...(thumbnailUrl && { thumbnailUrl }),
    ...(contentUrl && { contentUrl }),
    ...(embedUrl && { embedUrl }),
    uploadDate: uploadDate || new Date().toISOString(),
    ...(duration && { duration }),
    publisher: { '@id': `${BASE_URL}/#organization` },
  };
}

export function PersonSchema({ name, url, jobTitle, description, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    ...(url && { url }),
    ...(jobTitle && { jobTitle }),
    ...(description && { description }),
    ...(image && { image }),
  };
}

export function ServiceSchema({ name, description, providerName = 'Emotume' }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: providerName,
    },
  };
}

export function ProductSchema({ name, description, image, offers }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(image && { image }),
    ...(offers && {
      offers: {
        '@type': 'Offer',
        price: offers.price || '0',
        priceCurrency: offers.priceCurrency || 'USD',
        ...(offers.availability && { availability: offers.availability }),
      },
    }),
  };
}

export function ReviewSchema({ itemReviewed, reviewBody, authorName, reviewRating }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: itemReviewed,
    },
    reviewBody,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    ...(reviewRating && {
      reviewRating: {
        '@type': 'Rating',
        ratingValue: reviewRating,
        bestRating: 5,
      },
    }),
  };
}

export function HowToSchema({ name, description, steps }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function LocalBusinessSchema({ name, description, address, telephone, geo }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    description,
    ...(address && {
      address: {
        '@type': 'PostalAddress',
        ...address,
      },
    }),
    ...(telephone && { telephone }),
    ...(geo && {
      geo: {
        '@type': 'GeoCoordinates',
        ...geo,
      },
    }),
  };
}

export function ImageObjectSchema({ url, caption, width, height }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    url,
    ...(caption && { caption }),
    ...(width && { width }),
    ...(height && { height }),
  };
}

export function BlogPostingSchema({ headline, description, url, image, datePublished, dateModified, authorName = 'Emotume' }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url || BASE_URL}/#blogposting`,
    headline,
    description,
    ...(url && { url }),
    ...(image && { image }),
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'en-US',
  };
}

export function buildSchemas(schemas) {
  const scripts = schemas.map((schema) => ({
    type: 'application/ld+json',
    innerHTML: JSON.stringify(schema),
  }));

  const base = [
    OrganizationSchema(),
    WebsiteSchema(),
    SoftwareApplicationSchema(),
  ];

  return [...base, ...schemas].map((schema) => ({
    type: 'application/ld+json',
    innerHTML: JSON.stringify(schema),
  }));
}
