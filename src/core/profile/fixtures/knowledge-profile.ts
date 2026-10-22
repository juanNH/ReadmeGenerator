import { createEmptyProfile } from "../profile-operations";
import type { ProfileDocument } from "../profile-schema";

/** Fictional person and institutions; it does not represent real public activity. */
export function createKnowledgeExampleProfile(): ProfileDocument {
  const profile = createEmptyProfile("es");

  profile.data.presentation = {
    displayName: "Sol Ejemplo",
    headline: "Estudiante de desarrollo de software",
    bio: "Perfil ficticio para demostrar conocimientos y formación sin métricas públicas.",
    location: "",
  };
  profile.data.knowledge.items = [
    {
      id: "knowledge-accessible-forms",
      title: "Formularios accesibles",
      description:
        "Puedo asociar etiquetas, describir errores y revisar la navegación por teclado.",
    },
    {
      id: "knowledge-data-modeling",
      title: "Modelado de datos",
      description: "Conozco relaciones, restricciones y consultas básicas en bases de datos.",
    },
  ];
  profile.data.technologies.groups = [
    {
      id: "technology-group-learning",
      name: "Aplicadas en ejercicios de aprendizaje",
      items: [
        { id: "technology-typescript", name: "TypeScript", context: "Tipos y funciones puras" },
        { id: "technology-sql", name: "SQL", context: "Consultas y relaciones entre tablas" },
      ],
    },
  ];
  profile.data.education.items = [
    {
      id: "education-software-degree",
      kind: "degree",
      title: "Tecnicatura en desarrollo de software",
      institution: "Instituto Ficticio del Sur",
      status: "in-progress",
      startDate: "2025",
      endDate: "",
      description: "Ejemplo ficticio de una carrera en curso.",
      url: "",
    },
  ];
  profile.visibility = {
    ...profile.visibility,
    presentation: true,
    knowledge: true,
    technologies: true,
    education: true,
  };

  return profile;
}
