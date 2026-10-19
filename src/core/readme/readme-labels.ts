export const readmeLabels = {
  en: {
    location: "Location",
    technologies: "Technologies",
    projects: "Projects",
    contributions: "Contributions",
    activity: "Activity & contributions",
    highlights: "Highlights",
    calendar: "GitHub contribution calendar",
    summary: "GitHub activity summary",
    languages: "Languages in analyzed repositories",
    contact: "Contact",
    role: "Role",
    moreInformation: "More information",
  },
  es: {
    location: "Ubicación",
    technologies: "Tecnologías",
    projects: "Proyectos",
    contributions: "Contribuciones",
    activity: "Actividad y contribuciones",
    highlights: "Aportes destacados",
    calendar: "Calendario de contribuciones de GitHub",
    summary: "Resumen de actividad de GitHub",
    languages: "Lenguajes de los repositorios analizados",
    contact: "Contacto",
    role: "Rol",
    moreInformation: "Más información",
  },
} as const;

export type ReadmeLabels = (typeof readmeLabels)[keyof typeof readmeLabels];
