import {
  ROLE_ORDER,
  type AcademicGrade,
  type ConcoursTargetGrade,
  isAcademicGrade,
} from '../constants/roles';

/** Lower index in ROLE_ORDER = more senior career grade. */
export function careerRank(grade: AcademicGrade): number {
  return ROLE_ORDER.indexOf(grade as (typeof ROLE_ORDER)[number]);
}

export type EligibilityCode = 'ok' | 'overqualified' | 'too_junior' | 'no_grade' | 'super_admin';

export type EligibilityDetail = {
  code: EligibilityCode;
  /** French explanation for UI */
  message: string;
};

const messages: Record<Exclude<EligibilityCode, 'ok'>, string> = {
  overqualified:
    'Votre grade de carrière actuel est déjà égal ou supérieur au grade visé — vous ne pouvez pas postuler.',
  too_junior:
    'Votre grade de carrière est trop junior pour les critères d’éligibilité de ce concours.',
  no_grade: 'Grade de carrière indéfini — impossible de vérifier l’éligibilité.',
  super_admin: 'Les comptes administrateur ne sont pas éligibles aux concours.',
};

/**
 * Eligibility to apply for a promotion concours:
 * - Must be strictly more junior than the target grade (rank index strictly greater).
 * - If `maxJuniorEligibleGrade` is set: must be at least as senior as that grade
 *   (cannot be more junior than allowed): rank(user) <= rank(maxJunior).
 */
export function evaluateConcoursEligibility(
  userRole: string,
  userCurrentGrade: string | undefined | null,
  targetGrade: ConcoursTargetGrade,
  maxJuniorEligibleGrade: AcademicGrade | undefined | null
): EligibilityDetail {
  if (userRole === 'super_admin') {
    return { code: 'super_admin', message: messages.super_admin };
  }
  if (!userCurrentGrade || !isAcademicGrade(userCurrentGrade)) {
    return { code: 'no_grade', message: messages.no_grade };
  }

  const ru = careerRank(userCurrentGrade);
  const rt = careerRank(targetGrade as AcademicGrade);

  if (ru <= rt) {
    return { code: 'overqualified', message: messages.overqualified };
  }

  if (maxJuniorEligibleGrade) {
    const rj = careerRank(maxJuniorEligibleGrade);
    if (ru > rj) {
      return { code: 'too_junior', message: messages.too_junior };
    }
  }

  return { code: 'ok', message: '' };
}

/** Validates admin input: floor must be strictly more junior than target (higher rank index). */
export function isValidMaxJuniorForTarget(
  targetGrade: ConcoursTargetGrade,
  maxJuniorEligibleGrade: AcademicGrade
): boolean {
  return careerRank(maxJuniorEligibleGrade) > careerRank(targetGrade as AcademicGrade);
}
