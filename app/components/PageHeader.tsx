import Link from 'next/link';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: Breadcrumb[];
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col border-b border-bg-input px-6 py-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-2">
        <ol className="flex items-center space-x-2 text-sm text-text-muted">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            
            return (
              <li key={index} className="flex items-center">
                {crumb.href && !isLast ? (
                  <Link 
                    href={crumb.href} 
                    className="hover:text-primary transition-colors hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-text-main font-medium" : ""}>
                    {crumb.label}
                  </span>
                )}
                
                {!isLast && (
                  <span className="mx-2 text-text-muted select-none">/</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      
      {/* Title & Actions */}
      <div className="flex items-center justify-between mt-1">
        <div>
          <h1 className="text-2xl font-normal text-text-main tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
