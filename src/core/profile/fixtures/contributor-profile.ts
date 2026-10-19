import { createEmptyProfile } from "../profile-operations";
import type { ProfileDocument } from "../profile-schema";

/** Fictional person, projects and links; this factory never retrieves GitHub activity. */
export function createContributorExampleProfile(): ProfileDocument {
  const profile = createEmptyProfile("en");

  profile.data.presentation = {
    displayName: "Alex Example",
    headline: "Software developer and open source contributor",
    bio: "Fictional profile demonstrating authored projects and contributions, with optional metrics.",
    location: "Example City",
  };
  profile.data.knowledge.items = [
    {
      id: "knowledge-accessibility",
      title: "Accessible interfaces",
      description: "Designing keyboard interactions and explaining validation errors clearly.",
    },
  ];
  profile.data.technologies.groups = [
    {
      id: "technology-group-web",
      name: "Web development",
      items: [
        { id: "technology-typescript", name: "TypeScript", context: "Typed application contracts" },
        { id: "technology-react", name: "React", context: "Interactive user interfaces" },
      ],
    },
  ];
  profile.data.education.items = [
    {
      id: "education-accessibility-course",
      kind: "course",
      title: "Accessible web foundations",
      institution: "Fictional Learning Institute",
      status: "completed",
      startDate: "2024",
      endDate: "2024",
      description: "Fictional course used only as demonstration content.",
      url: "https://example.com/fictional-course",
    },
  ];
  profile.data.current.items = [
    {
      id: "current-collaboration",
      kind: "collaboration",
      description: "Fictional example: interested in collaborating on accessible developer tools.",
      url: "",
    },
  ];
  profile.data.projects.items = [
    {
      id: "project-demo-notebook",
      name: "Demo Notebook",
      description: "Fictional learning project for organizing notes with accessible controls.",
      role: "Interface design and implementation",
      technologies: ["TypeScript", "React"],
      links: [
        {
          id: "project-notebook-reference",
          label: "Fictional project reference",
          url: "https://example.com/fictional-projects/demo-notebook",
        },
      ],
    },
  ];
  profile.data.contributions.items = [
    {
      id: "contribution-demo-documentation",
      title: "Documentation improvements",
      description:
        "Fictional contribution demonstrating a self-authored description of an improvement.",
      url: "https://example.com/fictional-contributions/documentation",
    },
  ];
  profile.data.metrics = {
    username: "fictional-profile-example",
    cards: ["calendar", "summary", "languages"],
  };
  profile.data.contact.links = [
    {
      id: "contact-example-portfolio",
      label: "Fictional portfolio",
      url: "https://example.com/fictional-portfolio",
    },
  ];
  profile.visibility = {
    presentation: true,
    knowledge: true,
    technologies: true,
    education: true,
    current: true,
    projects: true,
    contributions: true,
    metrics: true,
    contact: true,
  };

  return profile;
}
