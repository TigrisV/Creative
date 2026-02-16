"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// ─── Country data: code, dial, flag emoji, name, phone digit count (excluding country code) ───
export interface CountryInfo {
  code: string;
  dial: string;
  flag: string;
  name: string;
  digits: number; // expected digits after country code
}

export const countries: CountryInfo[] = [
  { code: "TR", dial: "+90", flag: "🇹🇷", name: "Türkiye", digits: 10 },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "ABD", digits: 10 },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "İngiltere", digits: 10 },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Almanya", digits: 11 },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "Fransa", digits: 9 },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "İtalya", digits: 10 },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "İspanya", digits: 9 },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Hollanda", digits: 9 },
  { code: "RU", dial: "+7", flag: "🇷🇺", name: "Rusya", digits: 10 },
  { code: "UA", dial: "+380", flag: "🇺🇦", name: "Ukrayna", digits: 9 },
  { code: "GR", dial: "+30", flag: "🇬🇷", name: "Yunanistan", digits: 10 },
  { code: "BG", dial: "+359", flag: "🇧🇬", name: "Bulgaristan", digits: 9 },
  { code: "RO", dial: "+40", flag: "🇷🇴", name: "Romanya", digits: 9 },
  { code: "GE", dial: "+995", flag: "🇬🇪", name: "Gürcistan", digits: 9 },
  { code: "AZ", dial: "+994", flag: "🇦🇿", name: "Azerbaycan", digits: 9 },
  { code: "IR", dial: "+98", flag: "🇮🇷", name: "İran", digits: 10 },
  { code: "IQ", dial: "+964", flag: "🇮🇶", name: "Irak", digits: 10 },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "S. Arabistan", digits: 9 },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "BAE", digits: 9 },
  { code: "EG", dial: "+20", flag: "🇪🇬", name: "Mısır", digits: 10 },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "Hindistan", digits: 10 },
  { code: "CN", dial: "+86", flag: "🇨🇳", name: "Çin", digits: 11 },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "Japonya", digits: 10 },
  { code: "KR", dial: "+82", flag: "🇰🇷", name: "G. Kore", digits: 10 },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brezilya", digits: 11 },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Kanada", digits: 10 },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Avustralya", digits: 9 },
  { code: "AT", dial: "+43", flag: "🇦🇹", name: "Avusturya", digits: 10 },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "İsviçre", digits: 9 },
  { code: "SE", dial: "+46", flag: "🇸🇪", name: "İsveç", digits: 9 },
  { code: "NO", dial: "+47", flag: "🇳🇴", name: "Norveç", digits: 8 },
  { code: "DK", dial: "+45", flag: "🇩🇰", name: "Danimarka", digits: 8 },
  { code: "PL", dial: "+48", flag: "🇵🇱", name: "Polonya", digits: 9 },
  { code: "CZ", dial: "+420", flag: "🇨🇿", name: "Çekya", digits: 9 },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portekiz", digits: 9 },
  { code: "IL", dial: "+972", flag: "🇮🇱", name: "İsrail", digits: 9 },
];

export interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  countryCode?: string;
  onCountryChange?: (code: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  countryCode = "TR",
  onCountryChange,
  className,
  placeholder,
  disabled,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const country = useMemo(
    () => countries.find((c) => c.code === countryCode) || countries[0],
    [countryCode]
  );

  const digitsOnly = value.replace(/\D/g, "");
  const isComplete = digitsOnly.length === country.digits;
  const isTooLong = digitsOnly.length > country.digits;

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-()]/g, "");
    // Limit to country digit count
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= country.digits) {
      onChange(raw);
    }
  };

  return (
    <div className={cn("relative flex items-center gap-0", className)}>
      {/* Country selector button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-l-md border border-r-0 bg-muted/50 px-2 py-2 text-[12px] font-medium transition-colors hover:bg-muted",
          "h-10 min-w-[90px] justify-center",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="text-base leading-none">{country.flag}</span>
        <span className="text-[11px]">{country.dial}</span>
        <svg className="ml-0.5 h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Phone number input */}
      <input
        type="tel"
        disabled={disabled}
        value={value}
        onChange={handlePhoneChange}
        placeholder={placeholder || `${country.digits} haneli numara`}
        className={cn(
          "flex h-10 w-full rounded-r-md border bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isTooLong && "border-destructive focus-visible:ring-destructive",
          isComplete && !isTooLong && "border-emerald-500 focus-visible:ring-emerald-500"
        )}
      />

      {/* Digit count indicator */}
      <span className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums pointer-events-none",
        isComplete ? "text-emerald-600" : digitsOnly.length > 0 ? "text-amber-500" : "text-muted-foreground"
      )}>
        {digitsOnly.length}/{country.digits}
      </span>

      {/* Country dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-md border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ülke ara..."
              className="mb-1 w-full rounded-sm border-0 bg-muted/50 px-2 py-1.5 text-[12px] outline-none placeholder:text-muted-foreground"
            />
            <div className="max-h-[200px] overflow-y-auto">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryChange?.(c.code);
                    setOpen(false);
                    setSearch("");
                    // Reset phone if switching country
                    onChange("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors hover:bg-accent",
                    c.code === countryCode && "bg-accent font-medium"
                  )}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-muted-foreground">{c.dial}</span>
                  <span className="text-[10px] text-muted-foreground">({c.digits} hane)</span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="py-2 text-center text-[11px] text-muted-foreground">Ülke bulunamadı</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Validation helpers ─────────────────────────────────────────────
export function isPhoneValid(phone: string, countryCode: string): boolean {
  const country = countries.find((c) => c.code === countryCode);
  if (!country) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length === country.digits;
}

export function formatFullPhone(phone: string, countryCode: string): string {
  const country = countries.find((c) => c.code === countryCode);
  if (!country) return phone;
  const digits = phone.replace(/\D/g, "");
  return `${country.dial} ${digits}`;
}

export function isEmailValid(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email.trim());
}
