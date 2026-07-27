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
  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-bg-input bg-bg-dark px-6">
      <div className="flex items-center gap-3">
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
