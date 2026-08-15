import { Helmet } from 'react-helmet-async';
import { buildMeta } from '../../utils/seo';
import { buildSchemas } from '../../utils/schema';

export default function SEO({ schema, ...metaProps }) {
  const { title, meta, link } = buildMeta(metaProps);

  const jsonldScripts = schema
    ? buildSchemas(Array.isArray(schema) ? schema : [schema])
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      {meta.map((tag, i) => {
        if (tag.name) {
          return <meta key={`meta-${i}`} name={tag.name} content={tag.content} />;
        }
        if (tag.property) {
          return <meta key={`meta-${i}`} property={tag.property} content={tag.content} />;
        }
        return null;
      })}
      {link.map((lnk, i) => (
        <link key={`link-${i}`} rel={lnk.rel} href={lnk.href} {...(lnk.hrefLang ? { hrefLang: lnk.hrefLang } : {})} />
      ))}
      {jsonldScripts.map((script, i) => (
        <script key={`jsonld-${i}`} type={script.type}>{script.innerHTML}</script>
      ))}
    </Helmet>
  );
}
