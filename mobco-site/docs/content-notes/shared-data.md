# Content notes — shared data & chrome (foundation)

Items the client must confirm or supply. Source: `assets/js/data/site-data.js`, `partials/*.html`.

- Project names that are descriptive (flag `nameIsDescriptive: true`): **Lagoon Villa Community** (image
  `aerial-compound`), **Innovation Campus** (image `campus`; the render shows a "SIC" sign), **Classical Landmark**
  (image `ksa-landmark`; region KSA inferred from the old site's KSA card, city unknown). Need real names, locations, status.
- All projects: `status` is `null` (unknown). No areas, storeys, values or dates are stated.
- Subsidiary descriptions (`SUBSIDIARIES[].short/long/focus`) are generic, written from company names + brief facts — confirm.
- Office coordinates are approximate (`geo.approx: true`): Al Ebdaa Tower Riyadh ≈ 24.7136, 46.6753; Mivida New Cairo ≈ 30.013, 31.526.
- Stats discrepancy: home stats say 430+ projects delivered; About narrative says "more than 150 projects". Both kept verbatim.
- "Riyadh" is added to the KSA address (brief §2); the original footer omitted the city.
- Canonical / OG URLs use the placeholder domain `https://mobco-group.com/` (TODO(deploy)). `sitemap.xml` is an empty placeholder.
- Footer newsletter is client-side only (shows a toast); no mailing list exists.
- No social-media links are shown (none supplied).
- Arabic copy is a professional translation of the supplied English and should be reviewed by the client.
