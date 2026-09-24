# OTO / upsell flow

How we structure a second offer alongside the main one. Written from what we
built on **india.mysuperme.com**, for reuse on the other funnels.

Structure and mechanics only. **All copy, prices and offer contents come from
the manager per site.**

> **Theme rule.** Every page below uses the receiving site's own palette, type
> scale, radii and button styling. The selector, the tier cards and the
> thank-you pages are the same design language as the landing page, not a
> separate template. Clean and modern: plenty of whitespace, one accent colour,
> and the price as the biggest number on the screen.

---

## The decision: where the second offer goes

Two shapes. Pick one per site — running both is how a funnel starts feeling
like a trap.

### Shape A — tier selector before payment (what we shipped)

```
Landing page  →  /checkout  →  hosted payment page  →  thank-you page
                  ▲                                      (one per tier)
                  │
          both tiers shown here,
          one of them pre-selected
```

The buyer sees both options **before** paying and pays once. The second tier is
presented as a **total**, never as an extra to be added later.

**Choose this when** the upgrade is a better version of the same thing
(recordings, extended Q&A, extra materials) and the price gap is small.

**Why we moved to it here.** The previous build showed the upgrade *after*
payment, on a countdown. That is a new price appearing after the money has
moved, which reads as a bait — and it is the shape most likely to generate
refund requests and card disputes. Both prices visible while deciding costs a
little upgrade-take-rate and buys back trust you cannot re-earn later.

### Shape B — one-time offer after payment

```
Landing page  →  payment  →  OTO page  →  thank-you page
                              (accept / decline, both lead on)
```

A genuinely different product offered once, immediately after purchase.

**Choose this when** the second offer is a *different* thing (a 1:1
consultation, a longer programme, a physical product) that would confuse the
main decision if shown alongside it.

**If you use this shape, these are not optional**

- **A visible decline that is as easy as the accept.** Not a small grey link.
  If declining is hard the page is a dark pattern, and that is what chargebacks
  are made of.
- **No countdown timer and no "this page will never be shown again".** Both are
  pressure applied after the card has been charged.
- **Declining must not feel like a loss of what they already bought.** The
  decline copy confirms the original purchase is safe and complete.
- The buyer reaches the thank-you page either way.

### Shape C — deposit, then consultation, then balance

```
Landing page  →  small refundable hold  →  booking call  →  balance payment
                                            (option chosen on the call)
```

Used where the real product is high-ticket and needs a human conversation to
size. The hold is fully refundable and credited to whichever option they pick.

**Non-negotiable:** the page after the hold must say, above the fold, that
**there is nothing to buy before the call** and must offer no way to pay from
there. Without that, taking money before naming a price is indistinguishable
from a bait.

---

## Mechanics (applies to whichever shape)

### One hosted payment page per price

Hosted checkout pages have their **amount fixed in the dashboard**. It cannot
be passed in on the URL. So:

> **one price = one page.** Two tiers and two price steps means four pages.

Keep each page's URL in its own environment variable and resolve which one to
open **at request time**, not at build time, or a price change will need a
redeploy to take effect.

### Use the canonical page URL, never the share shortlink

The dashboard's "copy link" button usually gives a shortlink. **Shortlinks 302
to the real page and drop the query string.** Everything you attached to the
URL — attribution, prefilled fields — is gone one hop later, silently. The
payment still succeeds, so nobody notices until someone asks where the sales
data went.

Paste the long-form page URL. If a shortlink might get pasted again by someone
else later, resolve it server-side once and cache it.

### Carry attribution through the payment

The identifiers that matter (ad click ids, first-party cookies, the visitor's
IP and user agent) exist **only in the buyer's browser** and die the moment
they leave for a checkout you do not host. The webhook cannot recover them —
that request comes from the payment provider's servers.

So capture them on the way out, in a redirect route of your own, and write them
into a **custom field on the payment page** that comes back on the webhook.

- Most providers cap a custom field's length. Ours caps at 512 characters, so
  the blob is compressed, encoded and **split across two fields** that the
  webhook rejoins. Both fields must exist on the payment page or the columns
  arrive empty.
- Record **which tier** and **which price step** in that blob. Do not infer
  them from the amount later — amounts get repriced and historic rows then read
  as the wrong tier.

### One webhook, not one per tier

A single endpoint for every payment, with the tier read from the custom field.

- **Gate on ownership.** If the payment account is shared with other products,
  the webhook receives *every* captured payment on the account. Without a check
  that the payment came from this funnel, other products' sales land in your
  CRM and get reported as conversions. Accept only payments carrying your
  attribution field or a funnel marker, acknowledge the rest and drop them.
- **Check the amount** against the prices you expect, and log loudly on a
  mismatch.
- **Fire the conversion event once per buyer.** An upsell must not send a
  second purchase event or the ad platform optimises against a number that is
  double-counting your best customers.

### A separate thank-you page per tier

One page per tier, not one page with conditional blocks.

- The upgraded tier's page **leads with what the upgrade actually gets them**,
  then the normal confirmation content. That is the first moment they can feel
  the extra money was worth it.
- **The base tier's page must not offer the upgrade.** It is a cross-sell to
  someone who has just decided, it undercuts the purchase they made, and where
  messaging templates are involved it re-categorises a transactional message as
  marketing.
- Each page should be the redirect target set on its own payment page.

---

## Presenting tiers (Shape A)

- **The base tier is pre-selected and cannot be deselected.** It is the product;
  the upgrade is a modifier on it.
- **Show the upgrade price as the TOTAL**, with wording that says so in as many
  words — "X total, not on top". Buyers read two prices side by side as
  additive unless told otherwise, and that misread surfaces as a refund request.
- On phones, put the upgrade toggle in the **sticky bar as well as the card**.
  The upgrade card scrolls out of view long before the reader reaches a CTA, and
  an upgrade they cannot see is an upgrade they do not take.
- **Do not put the selector on the landing page.** It asks the reader to decide
  *whether* and *which* at the same time, in the middle of being persuaded of
  the first. The upgrade question only means anything after "yes".
- Show what the base tier **does not** include, plainly. That line is what makes
  the upgrade legible, and hiding it is what makes people feel tricked.

---

## Compliance

- Claims, struck-through "regular" prices and savings badges must be
  defensible. An anchor price has to be a price the business actually charges,
  not a number chosen to size the discount. In India this is ASCI's code and
  the Consumer Protection Act 2019.
- Any deadline or price rise stated on the page must be real and must actually
  take effect on the stated date. Drive it from config so it moves on its own
  rather than relying on someone remembering.
- A "money-back guarantee" has to describe the real refund process, in the
  refunds policy, in the same words.

---

## Before you call it done

- [ ] Shape chosen and written down, and only one shape is in play.
- [ ] One payment page per price, each in its own env var, resolved per request.
- [ ] Canonical page URLs in env, not shortlinks — attribution verified to
      arrive on a real test payment.
- [ ] Custom attribution fields exist on every payment page.
- [ ] One webhook, ownership-gated, amount-checked, one conversion per buyer.
- [ ] A thank-you page per tier, each set as its own page's redirect target.
- [ ] The base thank-you page does not mention the upgrade.
- [ ] Upgrade price is stated as a total, in words.
- [ ] If Shape B: decline is as prominent as accept, and there is no countdown.
- [ ] If Shape C: "nothing to buy before the call" is above the fold, and the
      page offers no way to pay.
- [ ] Every page matches the receiving site's existing theme.
