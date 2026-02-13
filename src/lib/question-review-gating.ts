function isTruthyEnv(value: unknown): boolean {
  const v = String(value ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function isOnlyValidatedQuestionsEnforced(): boolean {
  return isTruthyEnv(process.env.ENFORCE_ONLY_VALIDATED_QUESTIONS)
}

/**
 * Adds review gating for endpoints that SELECT new questions for users.
 * - Always excludes QUARANTINED.
 * - When ENFORCE_ONLY_VALIDATED_QUESTIONS=true, returns only VALIDATED.
 *
 * Note: This is intentionally small and Prisma-where-shaped.
 */
export function getQuestionReviewWhere(opts?: { bypassValidatedEnforcement?: boolean }): any {
  const enforceValidated =
    !opts?.bypassValidatedEnforcement && isOnlyValidatedQuestionsEnforced()

  if (enforceValidated) {
    return { reviewStatus: 'VALIDATED' }
  }

  return { reviewStatus: { not: 'QUARANTINED' } }
}
