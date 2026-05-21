// Engine defaults that are NOT part of the conversational input contract
// but are still required for `calculateFireMonthly` to produce sensible
// results. Shared by the Simple calculator mount-effect and the chat
// Calculate flow so a chat-first user gets the same numbers as a form-first
// user.
//
// Apply with "stamp only if 0" semantics — never overwrite a value the user
// has already set explicitly via the form wizard or simple sliders.
export const FIRE_ENGINE_DEFAULTS = {
  lifeExpectancy: 90,
  withdrawalRate: 0.04,
  inflationRate: 0.03,
  expectedReturn: 0.07,
  healthcareInflation: 0.05,
} as const;

export type FireEngineDefaultKey = keyof typeof FIRE_ENGINE_DEFAULTS;
