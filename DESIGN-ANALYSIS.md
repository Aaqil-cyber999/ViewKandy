# View Kandy design analysis and recreation blueprint

## Summary
This project is being reshaped toward a premium Sri Lanka tourism aesthetic inspired by the live reference at https://srilanka.travel. The app remains structurally faithful to the existing Next.js + App Router + TypeScript setup, while the presentation layer is being tuned toward cinematic travel editorial design: dark, atmospheric hero photography; warm premium accents; airy whitespace; highlighted category cards; and a strong destination-story rhythm.

## Reference direction observed
The reference site uses a restrained premium travel language rather than loud marketing UI:
- Full-bleed, cinematic hero imagery with strong dark overlays
- Deep navy editorial background blocks for storytelling sections
- Warm gold or sand accents used sparingly for key actions and highlights
- Light neutral surfaces for discovery cards and soft editorial contrast
- Large serif display typography paired with clean sans body styling
- Large-spacing, highly legible card grids and layered section rhythm

## Palette direction
Primary design cues are tuned toward a Kandy identity built from hill-country scenery, temple culture, lake reflections, and warm evening light.

- Deep navy: `#071d2d`
- Secondary navy: `#0d2a3a`
- Emerald teal: `#0f5d67`
- Sandy gold: `#d8b77d`
- Warm stone: `#f7f1e7`
- Soft moss: `#dfece9`
- Ink: `#0d1e2c`
- Muted copy: `#4d6772`

## Typography direction
- Display serif: Fraunces / editorial serif for travel headlines
- Body sans: DM Sans / clean modern sans for navigation and content
- Large line-height and tight tracking for hero headings
- Strong hierarchy with oversized section headings and legible contrast

## Recreation blueprint
The current homepage and shared styling system are being aligned to match this pattern:
1. Full-bleed hero with layered image, dark overlay, headline, CTA row, and stat chips
2. Editorial “everything you need” section with icon cards
3. Story/travel feature cards on dark background
4. Alternating light and dark section rhythm
5. Destination list / itinerary-style card cluster
6. Event and seasonal highlights grid
7. Rich footer with layered brand and navigation columns

## Confidence notes
- Hero composition: High confidence — directly reflected in the transformed homepage
- Palette direction: High confidence — derived from visual reference and imposed as a consistent token system
- Typography rhythm: High confidence — the serif/sans combination is clearly present in the reference’s design
- Section ordering: High confidence — the editorial travel flow is clearly legible from the live site structure
- Fine micro-detail tuning: Medium confidence — additional page-by-page tuning will improve fidelity further

## Recommended next improvements
- Expand the design system to a reusable component library route and page blocks
- Rebuild route-specific landing pages to match the same rhythm
- Polish responsiveness and motion at tablet/mobile breakpoints
- Add final accessibility and QA sweeps before moving to a full multi-page parity pass
