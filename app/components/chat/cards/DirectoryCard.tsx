// Office directory card. Extracted from ChatMessage.tsx.

import { MapPin, Mail, Phone, Clock, Building2 } from "lucide-react";

import type { DirectoryCard as DirectoryCardData } from "@/lib/types";

export function DirectoryCard({ directory }: { readonly directory: DirectoryCardData }) {
  return (
    <div className="w-full rounded-2xl border border-forest-900/10 bg-forest-50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Building2 className="h-4 w-4 flex-shrink-0 text-forest-700 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-forest-900 break-words">{directory.office}</p>
          {directory.location && (
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-ink-700">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-forest-700 mt-0.5" />
              <span className="break-words">{directory.location}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {directory.email && (
          <a
            href={`mailto:${directory.email}`}
            className="flex items-center gap-1.5 text-forest-800 hover:text-forest-900 break-all"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.email}
          </a>
        )}
        {directory.phone && (
          <a
            href={`tel:${directory.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-1.5 text-forest-800 hover:text-forest-900"
          >
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.phone}
          </a>
        )}
        {directory.hours && (
          <p className="flex items-center gap-1.5 text-ink-600 sm:col-span-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.hours}
          </p>
        )}
      </div>
    </div>
  );
}
