// Program options used across the application
// These programs are available in the user edit form and Groups page
export const PROGRAM_OPTIONS = [
  "Vitas Nature Coast",
  "Vitas Citrus",
  "Vitas Jacksonville",
  "Vitas V/F/P",
  "Vitas Midstate",
  "Vitas Brevard",
  "Vitas Dade/Monroe",
  "Vitas Palm Beach",
  "AdventHealth IPU",
  "AdventHealth Central Florida",
  "Vitas Treasure Coast",
  "Haven",
  "Vitas Jacksonville (St. Johns)",
  "Vitas Broward",
  "Vitas Central Florida",
] as const;

export type ProgramOption = typeof PROGRAM_OPTIONS[number];
