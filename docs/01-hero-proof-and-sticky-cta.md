# Hero banner, proof-first order, sticky CTA, light hero

A pattern we implemented on **india.mysuperme.com** and want repeated across the
other funnels. Four changes, independent of each other — ship whichever apply.

This file describes **structure and behaviour only**. Copy, images and exact
colours come from the manager per site.

> **Theme rule, applies to all four.** Nothing here introduces a new colour, a
> new font or a new component style. Every element uses the receiving site's own
> palette, type scale, radii, shadows and button styling, so the result looks
> native rather than bolted on. Clean and modern: generous whitespace, one
> accent colour doing the work, no gradients or drop shadows that the rest of
> the site does not already use.

---

## 1 · Banner image under the hero headline (phones only)

**What.** A single wide image directly between the hero headline and the
paragraph beneath it. Visible **below the `sm` breakpoint only**.

**Why phones only.** On desktop the hero is two columns and the right-hand
column already carries the imagery. A second wide image above it says the same
thing twice and pushes the CTA below the fold. On a phone the hero is one
column and there is a gap between the promise and the explanation with nothing
to look at — that gap is what the banner fills.

**Rules**

- Sits **after the `<h1>`, before the standfirst paragraph**. Not above the
  headline: the headline has to land first.
- **Make the whole banner a link to the primary CTA.** These banners almost
  always contain a *picture* of a button, and a picture of a button gets
  tapped. If it is not a link, the tap silently fails and the visitor concludes
  the page is broken. Give it the same click-tracking hook as every other CTA
  and an `aria-label` carrying the CTA wording, since the artwork's own text is
  invisible to a screen reader.
- Load it **eagerly / with priority**. It is above the fold on the device it
  appears on; lazy loading leaves a wide empty box mid-hero on first paint.
- Match the site's card treatment — same corner radius and border as other
  cards, so it reads as part of the page.
- Reserve the aspect ratio (width + height, or an aspect-ratio box) so the
  page does not jump when it loads.

**Asset spec for whoever supplies the image**

| Item | Value |
|---|---|
| Format | JPEG (no transparency needed) |
| Width | ~1400px |
| File size | Under ~250KB |
| Aspect | 16:9 works; anything much taller pushes the CTA off the fold |

> **Do not ship the PNG straight out of the design tool.** The one we received
> was a 1.5MB PNG. Re-encoded to a 1400px JPEG it was 187KB — 88% smaller with
> no visible difference. A 1.5MB hero image is the single slowest thing on the
> page on a phone.

**Legibility warning.** These banners are usually designed at desktop size and
then dropped into a ~350px-wide slot. Anything below about 20px in the original
becomes unreadable. Ask the designer for a **phone-specific crop or version**
with fewer elements and larger type, rather than shrinking the desktop artwork.

---

## 2 · Testimonials as the second section

**What.** Proof runs directly under the hero, before any explanation of the
method, the schedule or the bonuses.

**Why.** Someone who has just read the promise wants to know whether it is
true, not how it works. Explanation before proof asks them to take the promise
on trust for several screens.

**Order inside the section** — include only the formats the site actually has,
in this order:

1. **Video testimonials**
2. **Transformation / before-and-after images**
3. **WhatsApp or other chat screenshots**

Video first because a face is the most persuasive and the least fakeable.
Screenshots last because they take the longest to read.

**Rules**

- One section, not three. Sub-headings inside it, not new sections with their
  own full-size headings — three separate proof sections read as the page
  repeating itself.
- Keep every card in a format at one size. Two card sizes in one wall make the
  smaller set read as an afterthought.
- Skip any format the site does not have. Do not invent a placeholder.

---

## 3 · Sticky CTA bar

**What.** A bar fixed to the bottom of the viewport on every screen size,
carrying exactly two things: a reassurance line, and the button.

**Layout**

```
Phone                              sm and up
┌────────────────────────────┐     ┌──────────────────────────────────────────┐
│  ✓ Guarantee · Start date  │     │  ✓ Guarantee · Start date      [ CTA ]   │
│  [        CTA        ]     │     └──────────────────────────────────────────┘
└────────────────────────────┘
   text centred, button           text left, button right, one row
   full-width beneath it
```

**Rules**

- **Two things only.** Reassurance line and button. No product name, no price
  in the bar, no session times, no logo. Everything else competes with the
  button for a strip roughly 100px tall.
- **No entrance animation and no scroll gate.** Paint it with the first frame.
  A reveal on the one element that exists to be pressed is a delay dressed as
  polish — the version we replaced was invisible for 1.1 seconds. If the offer
  is small enough to buy on impulse, there is nothing to earn before showing
  the button.
- **Full-width button on phones.** It is alone on its row; a centred pill with
  dead space either side is just a smaller target.
- **Reserve the bar's height in normal flow** with a spacer of the same height,
  or the bar covers the end of the footer at every viewport.
- **Pad for the iOS home indicator** with the bottom safe-area inset — and
  check the viewport meta includes `viewport-fit=cover`, without which that
  inset resolves to `0` and the padding silently does nothing.
- **Measure the bar against its spacer at 320px.** A reassurance line that
  wraps to two lines makes the bar taller than the spacer and the overlap comes
  straight back. Drop the type half a point or abbreviate the month rather than
  letting it wrap.

---

## 4 · Light hero background

**What.** The hero sits on the light end of the site's palette — white or the
palest tint. Not a dark or saturated block.

**Why.** The hero carries the headline, the standfirst, the primary CTA and
usually a product image. A dark ground forces light type, which costs contrast
on the small print, and forces the CTA to fight the background instead of being
the brightest thing on screen.

**Rules**

- Hero section background: white, or a tint at roughly 95% lightness or above.
- The CTA should be the most saturated element in the hero. If the background
  is competing, the background is wrong.
- Dark blocks are fine further down — a deep band behind a mid-page section or
  a checkout header gives rhythm. The rule is about the hero specifically.
- Already-light sites need no change. Check before editing rather than
  restyling something that already passes.

---

## Before you call it done

- [ ] Banner appears below `sm` only, links to the CTA, loads eagerly.
- [ ] Banner source is a JPEG under ~250KB.
- [ ] Testimonials is the section immediately after the hero.
- [ ] Proof formats run video → transformation images → chat screenshots.
- [ ] Sticky bar shows reassurance + date and the button, and nothing else.
- [ ] Sticky bar is visible in the very first painted frame.
- [ ] Bar height ≤ spacer height at 320px, 360px and 390px.
- [ ] Hero background is light; CTA is the most saturated thing in it.
- [ ] No horizontal scroll at 320 / 360 / 390 / 768 / 1024 / 1280 / 1440.
- [ ] Every element uses the receiving site's existing palette and type scale.
