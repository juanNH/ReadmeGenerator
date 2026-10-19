import { createEmptyProfile } from "../profile-operations";
import type { ProfileDocument } from "../profile-schema";

/** A manual starting point: no example person or preselected modules. */
export function createEmptyExampleProfile(): ProfileDocument {
  return createEmptyProfile("en");
}
