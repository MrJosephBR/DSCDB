import Link from "next/link";

export type NavItem = {
  href: string;
  label: string;
};

export default function NavSection({
  title,
  items,
  pathname
}: {
  title: string;
  items: NavItem[];
  pathname?: string;
}) {
  return (
    <div className="nav-section">
      <div className="nav-section-title">{title}</div>
      <div className="nav-section-links">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link className={active ? "active" : undefined} href={item.href} key={item.href}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
