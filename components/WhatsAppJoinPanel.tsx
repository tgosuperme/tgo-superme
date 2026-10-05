/**
 * The green "join the community" panel, shared by the confirmation pages and
 * the OTO.
 *
 * ── WHY IT IS A COMPONENT RATHER THAN A SECOND COPY ───────────────────────
 * This is the one instruction the whole funnel ends on: the Zoom links, the
 * reminders and the daily joining note all go out inside the community, so a
 * registrant who never joins it has registered for nothing. It now appears in
 * two places — at the foot of the OTO and on /confirmed — and the two saying
 * slightly different things about the SAME required step is the drift that
 * costs attendance.
 *
 * So the shell lives here and the pages supply their own words. The button is
 * passed in as children rather than owned here, because the confirmation page's
 * version is tied to its docked bar (it carries the `data-join-cta` marker that
 * bar watches to know when to step aside) and the OTO's deliberately is not.
 *
 * ── THE PANEL IS NOT GATED, AND THAT IS THE POINT ─────────────────────────
 * On the OTO it sits below the upgrade offer, where it is reached by everyone
 * who registered — whether or not they take the pass. See the note on the
 * decline button in app/oto/OtoChoice.tsx: the place is already real by then,
 * and the job of every screen after the form is to get people into the group.
 */
import { WarningCircle } from '@phosphor-icons/react/dist/ssr';

import { C } from '../app/_landing/shared';

export default function WhatsAppJoinPanel({
  eyebrow = 'Important',
  pulseEyebrow = false,
  title,
  body,
  footnote,
  className = '',
  children,
}: {
  /** The pill above the heading. */
  eyebrow?: string;
  /**
   * Gives the pill a slow white ping — see `.lego-pulse-badge` in globals.css.
   *
   * OPT-IN, and off by default, because the two pages are not in the same
   * situation. On the OTO this panel is competing with a paid offer directly
   * above it and is the last thing before the reader leaves, so it has to
   * reach for attention. On the confirmation page it is already the only
   * instruction on the screen, and something that moves next to a static
   * heading there would just be noise.
   */
  pulseEyebrow?: boolean;
  title: string;
  body: React.ReactNode;
  /** The line under the button. Omitted when there is no invite to open. */
  footnote?: React.ReactNode;
  className?: string;
  /** The join button itself, supplied by the page — see the note above. */
  children: React.ReactNode;
}) {
  return (
    <section
      data-lego=""
      className={`overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10 ${className}`}
      style={{
        background: `linear-gradient(150deg, ${C.mintInk} 0%, ${C.greenInk} 55%, #0F6B33 100%)`,
        boxShadow: '0 30px 60px -34px rgba(23,135,64,0.6)',
      }}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
          pulseEyebrow ? 'lego-pulse-badge' : ''
        }`}
        style={{ background: 'rgba(255,255,255,0.22)', color: '#FFFFFF' }}
      >
        <WarningCircle weight="fill" className="h-3 w-3" />
        {/* No "step 1 of 1". A counter that never counts past one is not
            telling the reader where they are, it is just noise around the only
            instruction on the page. */}
        {eyebrow}
      </span>

      <h2 className="mt-4 font-heading text-[clamp(22px,3.2vw,32px)] font-bold leading-tight text-white">
        {title}
      </h2>

      <p
        className="mx-auto mt-3 max-w-[460px] text-[14.5px] leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.88)' }}
      >
        {body}
      </p>

      <div className="mt-7">{children}</div>

      {footnote && (
        <p className="mt-3 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {footnote}
        </p>
      )}
    </section>
  );
}
