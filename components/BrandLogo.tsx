import Link from "next/link";

// ---------------------------------------------------------------------------
// BrandLogo — shared brand mark used on every page.
// Display format per brand spec:
//   "TrustQ"  (large, bold)
//   "Powered by Astris Integrity"  (small subtitle below)
// ---------------------------------------------------------------------------

interface BrandLogoProps {
  href?: string;
  /** "sm" = compact sidebar use; "md" = default; "lg" = landing hero */
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { name: "text-base", tag: "text-[9px]" },
  md: { name: "text-lg",   tag: "text-[10px]" },
  lg: { name: "text-2xl",  tag: "text-[11px]" },
};

export function BrandLogo({ href = "/", size = "md" }: BrandLogoProps) {
  const { name, tag } = sizeMap[size];

  const inner = (
    <span className="flex flex-col leading-tight">
      <span className={`font-bold text-brand-700 ${name}`}>TrustQ</span>
      <span className={`font-normal text-gray-400 tracking-wide ${tag}`}>
        Powered by Astris Integrity
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="inline-flex hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  );
}
