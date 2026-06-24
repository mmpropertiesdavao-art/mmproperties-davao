# Design system — navy & gold

## Palette

| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#081224` | Header/footer background, primary headings on light backgrounds |
| `navy-700` | `#142447` | Secondary surfaces, hover states on navy-900 |
| `navy-500` | `#2A436A` | Body text on light backgrounds, secondary buttons |
| `navy-100` | `#CBD5E5` | Borders and dividers on dark sections |
| `gold-500` | `#C6A136` | Primary CTA buttons, active filter chips, price highlights |
| `gold-300` | `#E3C566` | Hover state on gold-500, badges |
| `gold-100` | `#F5E8C2` | Light accent backgrounds (e.g. featured badge fill) |
| White / `gray-50` | — | Page background, card surfaces |

## Usage rules

Navy is the dominant brand color — it carries the header, footer, primary headings, and body text. Gold is an accent, not a second dominant color: it marks the single most important action on a screen (the main CTA button, the active state of a filter, the price on a property card) and should never cover more than a small fraction of any view. A page that's "half navy, half gold" reads as a sports jersey, not a premium real-estate brand — keep gold usage sparse and intentional.

Buttons: primary action = `bg-gold-500 text-navy-900 hover:bg-gold-300`. Secondary/outline action = `border border-navy-900 text-navy-900 hover:bg-navy-50`. Never gold-on-gold or navy-on-navy with no contrast — always pair gold fills with navy text and navy fills with white or gold text.

Links and active nav items: `text-gold-300` on navy backgrounds, `text-navy-900` with a `border-b-2 border-gold-500` underline on light backgrounds.

Status colors (lead pipeline badges, foreclosed tags, form validation) stay outside the navy/gold system — use standard semantic colors (green for success, red for error, amber for warning) so they remain instantly legible and don't compete with the gold accent for attention.

## Where it's applied so far

`tailwind.config.ts` defines the `navy` and `gold` color scales. `src/app/layout.tsx` (header), `src/app/(marketing)/page.tsx` (hero, CTA, neighborhood cards), `src/components/property/PropertyCard.tsx` (price, badges), and the new `src/app/admin/listings/new/page.tsx` and `src/app/admin/listings/import/page.tsx` all use the palette. `FilterBar`, `MapView`, `ComparisonTable`, `PaymentCalculator`, and the matcher page still use neutral grays/blues from the original scaffold — restyling those is a quick follow-up pass once you confirm this palette direction, since it's mechanical work (swap `blue-600` → `gold-500`, `gray-900` → `navy-900`) rather than a design decision.
