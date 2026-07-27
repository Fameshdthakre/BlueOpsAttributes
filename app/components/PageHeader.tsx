import Link from "next/link";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  children,
}: PageHeaderProps) {
  // If we have breadcrumbs and the first one has an href, use it for the back button
  const backHref =
    breadcrumbs && breadcrumbs.length > 1 && breadcrumbs[0].href
      ? breadcrumbs[0].href
      : null;

  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-bg-input bg-bg-dark px-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 -ml-2 rounded-full hover:bg-bg-input text-text-muted hover:text-text-main transition-colors"
            aria-label="Go back"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
        )}

        <h1 className="text-[22px] font-normal text-text-main tracking-tight whitespace-nowrap">
          {title}
        </h1>

        {subtitle && (
          <>
            <div
              className="h-6 w-px bg-bg-input mx-2 hidden sm:block"
              aria-hidden="true"
            ></div>
            <span className="text-sm text-text-muted hidden sm:block truncate max-w-md">
              {subtitle}
            </span>
          </>
        )}
      </div>

      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
