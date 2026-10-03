'use client';

/* eslint-disable jsx-a11y/label-has-associated-control -- every label uses
   htmlFor against an id on its input; airbnb additionally asserts nesting. */

/**
 * The form primitives, shared by the registration modal and the VIP checkout.
 *
 * Extracted when registration moved into a modal. The two forms ask the same
 * five questions, and two copies of a phone field with a hand-built listbox is
 * two copies of the keyboard handling, the dismiss behaviour and the validation
 * messages — which drift, silently, in the direction of whichever one was
 * edited last.
 */
import { CaretDown, CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useRef, useState } from 'react';

import {
  COUNTRIES,
  findCountry,
  flagFor,
  nationalDigits,
  PHONE_PLACEHOLDERS,
} from '../checkout/countries';
import { C } from '../_landing/shared';

/* ── validation ───────────────────────────────────────────────────────────
   Each validator returns the message to show, or null when the value is fine.
   Messages say what to DO, not that something is "invalid".

   Names are checked permissively on purpose: a rule that assumes Latin letters,
   or one word, or no apostrophes, locks out real people. The only things
   rejected are emptiness, a single character, and digits — which in a name
   field is always a mis-typed row rather than a name. */

export function nameError(value: string, label: string): string | null {
  const v = value.trim();
  if (!v) return `Please enter your ${label}.`;
  if (v.length < 2) return `That looks too short — please enter your full ${label}.`;
  if (/\d/.test(v)) return `A ${label} should not contain numbers.`;
  return null;
}

/* Deliberately not RFC 5322. That grammar accepts things no mail server will,
   and the only useful question here is whether a reply can reach them. This
   rejects the four mistakes that actually happen: no @, nothing before or after
   it, no dot in the domain, and a one-character TLD. */
export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Please enter your email address.';
  if (!/^[^\s@]+@[^\s@]+$/.test(v)) return 'Please include an @ in your email address.';
  const domain = v.split('@')[1] ?? '';
  if (!domain.includes('.')) return 'That email address is missing its domain, like .com.';
  if (!/\.[A-Za-z]{2,}$/.test(v)) return 'Please check the end of your email address.';
  if (/\.\./.test(v)) return 'That email address has two dots in a row.';
  return null;
}

export function phoneError(value: string, iso: string): string | null {
  const digits = nationalDigits(value);
  if (!digits) return 'Please enter your mobile number.';
  const country = findCountry(iso);
  if (digits.length < country.min) return 'That number looks too short.';
  if (digits.length > country.max) return 'That number looks too long.';
  return null;
}

export function cityError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Please enter your city or town.';
  if (v.length < 2) return 'That looks too short — please enter your city or town.';
  return null;
}

/* ── field label + message, shared by the text and phone fields ─────── */
export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em]"
      style={{ color: C.inkMuted }}
    >
      {children}
    </label>
  );
}

/**
 * The error line.
 *
 * role="alert" so a screen reader announces it when it appears, and it is wired
 * to the input with aria-describedby + aria-invalid rather than relying on the
 * red border alone — a border is invisible to a screen reader and to anyone who
 * cannot distinguish the colour.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug"
      style={{ color: C.coralInk }}
    >
      <WarningCircle weight="fill" className="mt-[2px] h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

const inputClass =
  'w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors';

export function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    background: C.white,
    border: `1px solid ${invalid ? C.coral : C.lineStrong}`,
    color: C.ink,
  };
}

/* ── one text input ─────────────────────────────────────────────────── */
export function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  /** Undefined when there is nothing to show yet — see `shown` in each form. */
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        style={inputStyle(Boolean(error))}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** One row height, and how many are visible before the list scrolls. */
const OPTION_H = 42;
const VISIBLE_OPTIONS = 6;

/**
 * Mobile number, with a dialling-code selector defaulting to the UK.
 *
 * The trigger and the input are two controls inside one bordered group, so the
 * pair reads as a single field. The border therefore lives on the wrapper and
 * both children are transparent — putting it on each control would draw a box
 * inside a box.
 *
 * The dropdown is custom rather than a native <select> because a native one
 * cannot be styled: it renders in the platform's own chrome, which on desktop
 * is a full-height white list in the OS font, entirely outside this page's
 * design. The cost of replacing it is that the keyboard and dismiss behaviour a
 * native select gives free has to be written — see the handlers below.
 *
 * The panel is a sibling of the bordered group, not a child, because that group
 * would otherwise need `overflow: hidden` for its corners and would clip the
 * list to a few pixels.
 */
export function PhoneField({
  iso,
  onIsoChange,
  value,
  onChange,
  onBlur,
  error,
}: {
  iso: string;
  onIsoChange: (iso: string) => void;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
}) {
  const country = findCountry(iso);
  const invalid = Boolean(error);

  const [open, setOpen] = useState(false);
  /* The row the keyboard is on, which is NOT the selected row until Enter. */
  const [active, setActive] = useState(() =>
    Math.max(0, COUNTRIES.findIndex((c) => c.iso === iso)),
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Dismiss on an outside press or Escape — the two things a native select does
     for free and whose absence reads as a broken menu. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* Stops the modal around this closing as well — one Escape should
           dismiss one thing, and the nearest open thing is this list. */
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  /* Keep the highlighted row in view when arrowing past the visible window. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const choose = (index: number) => {
    onIsoChange(COUNTRIES[index].iso);
    setActive(index);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') choose(active);
      else
        setActive((i) =>
          Math.min(
            COUNTRIES.length - 1,
            Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)),
          ),
        );
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="phone">Mobile number</FieldLabel>

      <div ref={wrapRef} className="relative">
        <div
          className="flex items-stretch rounded-xl transition-colors"
          style={inputStyle(invalid)}
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            onKeyDown={onTriggerKey}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Country dialling code, currently ${country.name} plus ${country.dial}`}
            className="flex shrink-0 items-center gap-1.5 rounded-l-xl py-3 pl-3.5 pr-2.5 text-[15px] transition-colors"
            style={{ color: C.ink, background: open ? C.paleBlue : 'transparent' }}
          >
            <span aria-hidden className="text-[16px] leading-none">
              {flagFor(country.iso)}
            </span>
            +{country.dial}
            <CaretDown
              weight="bold"
              aria-hidden
              className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              style={{ color: C.inkMuted }}
            />
          </button>

          <span aria-hidden className="my-2 w-px shrink-0" style={{ background: C.lineStrong }} />

          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={PHONE_PLACEHOLDERS[country.iso] ?? 'Mobile number'}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={invalid ? 'phone-error' : undefined}
            className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3.5 py-3 text-[15px] outline-none"
            style={{ color: C.ink }}
          />
        </div>

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Country dialling code"
            tabIndex={-1}
            /* Capped at six rows: tall enough to scan a group at a glance,
               short enough that it never runs off a phone screen or covers the
               fields underneath it. */
            className="absolute left-0 top-full z-50 mt-2 w-[min(320px,100%)] overflow-y-auto overscroll-contain rounded-2xl py-1.5"
            style={{
              maxHeight: OPTION_H * VISIBLE_OPTIONS,
              background: C.white,
              border: `1px solid ${C.lineStrong}`,
              boxShadow: '0 24px 48px -20px rgba(0,32,98,0.35)',
            }}
          >
            {COUNTRIES.map((c, i) => {
              const selected = c.iso === iso;
              return (
                <li key={c.iso} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    onMouseEnter={() => setActive(i)}
                    className="flex w-full items-center gap-2.5 px-3.5 text-left text-[14px] transition-colors"
                    style={{
                      height: OPTION_H,
                      background: i === active ? C.lightBlue : 'transparent',
                      color: selected ? C.blue : C.ink,
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <span aria-hidden className="text-[15px] leading-none">
                      {flagFor(c.iso)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 text-[13px]" style={{ color: C.inkMuted }}>
                      +{c.dial}
                    </span>
                    {selected && (
                      <CheckCircle
                        weight="fill"
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: C.blue }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FieldError id="phone-error" message={error} />
    </div>
  );
}
