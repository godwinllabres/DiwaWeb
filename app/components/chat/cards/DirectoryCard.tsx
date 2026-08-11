// Office directory card. Extracted from ChatMessage.tsx.

import { MapPin, Mail, Phone, Clock, Building2 } from "lucide-react";

import type { DirectoryCard as DirectoryCardData } from "@/lib/types";

export function DirectoryCard({ directory }: { readonly directory: DirectoryCardData }) {
  return (
    <div className="w-full rounded-2xl border border-forest-900/10 bg-forest-50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Building2 className="h-4 w-4 flex-shrink-0 text-forest-700 mt-0.5" />
        <div className="min-w-0 flex-1">
          {/* The card title was text-sm under a 15px paragraph — a heading
              smaller than the body it follows. */}
          <p className="text-[15px] font-semibold leading-snug text-forest-900 break-words">{directory.office}</p>
          {directory.location && (
            <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-[1.5] text-ink-700">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-forest-700 mt-0.5" />
              <span className="break-words">{directory.location}</span>
            </p>
          )}
        </div>
      </div>
      {/* The office's email, phone and hours are the payload of the whole
          answer, and they used to be the smallest, tightest type in the app:
          12px on a 16px line, giving 16px-tall link rows stacked on a 20px
          pitch. That fails WCAG 2.5.8 twice over — under 24x24, and too close
          together for the spacing exception to save it. 13px on a 1.5 line with
          py-1 makes each row ~28px on a ~32px pitch, which passes outright. */}
      <div className="mt-2 grid grid-cols-1 gap-1 text-[13px] leading-[1.5] sm:grid-cols-2">
        {directory.email && (
          <a
            href={`mailto:${directory.email}`}
            className="flex items-center gap-1.5 py-1 text-forest-800 underline underline-offset-2 decoration-forest-700/70 [overflow-wrap:anywhere] hover:text-forest-900 hover:decoration-forest-800"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.email}
          </a>
        )}
        {directory.phone && (
          <a
            href={`tel:${directory.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-1.5 py-1 text-forest-800 underline underline-offset-2 decoration-forest-700/70 hover:text-forest-900 hover:decoration-forest-800"
          >
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.phone}
          </a>
        )}
        {directory.hours && (
          <p className="flex items-center gap-1.5 py-1 text-ink-700 sm:col-span-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.hours}
          </p>
        )}
      </div>
    </div>
  );
}
