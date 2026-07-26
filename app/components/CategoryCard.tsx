import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly onClick: () => void;
  /** Grid placement from the caller (e.g. a bento span). Purely layout. */
  readonly className?: string;
}

/**
 * A topic tile in the chat's opening grid.
 *
 * The hover/press state animates a background layer sitting behind the
 * content rather than the card element itself: transforming the button would
 * resample its text every frame, while transforming the layer underneath
 * reads as the surface leaning forward and leaves the type crisp. Same
 * treatment as the landing page's bento tiles, so the two surfaces feel like
 * one product.
 */
export function CategoryCard({
  icon: Icon,
  title,
  description,
  onClick,
  className = "",
}: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      // h-full so cards sharing a bento row square off against each other:
      // without it a one-line description leaves a shorter card next to a
      // two-line one and the row reads as ragged.
      className={`group relative isolate flex h-full w-full items-start gap-4 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:p-5 ${className}`}
    >
      <span
        aria-hidden="true"
        className="sevi-lift absolute inset-0 -z-10 rounded-2xl border border-forest-900/10 bg-paper-raised transition-[transform,background-color,border-color] duration-200 ease-out group-hover:scale-[1.015] group-hover:border-forest-900/15 group-hover:bg-forest-50 group-active:scale-[0.99] group-active:bg-forest-100"
      />
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-900/[0.06] transition-colors group-hover:bg-forest-100 sm:h-11 sm:w-11">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold tracking-tight text-forest-900 sm:text-base">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-[1.6] text-ink-600 sm:text-sm">{description}</p>
      </span>
    </button>
  );
}
