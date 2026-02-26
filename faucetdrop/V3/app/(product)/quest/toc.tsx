"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  title: string;
}

export default function TableOfContents({
  sections,
}: {
  sections: Section[];
}) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-30% 0px -60% 0px",
      }
    );

    sections.forEach(section => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <aside className="sticky top-24 hidden h-fit lg:block">
      <h3 className="mb-4 text-base font-bold tracking-widest text-muted-foreground">
        ON THIS PAGE
      </h3>

      <ul className="space-y-3 border-l border-border pl-4">
        {sections.map(section => (
          <li key={section.id}>
            <button
              onClick={() => {
                const element = document.getElementById(section.id);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className={`block text-base transition-all ${
                activeId === section.id
                  ? "border-l-2 border-blue-600 pl-3 font-semibold text-blue-600 -ml-4"
                  : "text-muted-foreground hover:text-muted-foreground/70"
              }`}
            >
              {section.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
