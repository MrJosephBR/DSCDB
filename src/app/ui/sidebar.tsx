"use client";

import { usePathname } from "next/navigation";
import NavSection, { type NavItem } from "./nav-section";

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Research",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/compounds", label: "Compounds" },
      { href: "/datasets", label: "Datasets" },
      { href: "/diseases", label: "Diseases" }
    ]
  },
  {
    title: "Curation",
    items: [
      { href: "/imports", label: "Imports" },
      { href: "/duplicates", label: "Duplicate Reviews" },
      { href: "/audit", label: "Audit Log" }
    ]
  },
  {
    title: "Knowledge",
    items: [
      { href: "/references", label: "References" },
      { href: "/pathways", label: "Pathways" },
      { href: "/targets", label: "Targets / Interactions" },
      { href: "/samples", label: "Samples" },
      { href: "/measurements", label: "Measurements" }
    ]
  },
  {
    title: "Admin",
    items: [
      { href: "/users", label: "Users" },
      { href: "/account", label: "Settings" }
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand">DSCDB</div>
        <p className="tagline">VOC breathomics research console</p>
      </div>
      <nav className="nav" aria-label="Primary navigation">
        {navSections.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
