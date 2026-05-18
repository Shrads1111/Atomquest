export interface GoalNode {
  id: string;
  title: string;
  thrustArea: string;
  uom: "numeric" | "percentage" | "timeline" | "zero-based";
  assignedWeightageFactor: number; // 0..1
  target?: number;
  achieved?: number;
}

export interface ValidationResult {
  isValidationChainPassed: boolean;
  activeErrorLogsTraceCollection: string[];
  totalWeightPct: number;
}

export function verifyGoalSheetCompositionIntegrity(goals: GoalNode[]): ValidationResult {
  const RULE_MAX_OBJECTIVES_COUNT_BOUNDS = 8;
  const RULE_MIN_GOAL_WEIGHTAGE_FLOOR = 0.10;
  const RULE_TARGET_TOTAL_WEIGHT_MATCH = 1.0;

  let total = 0;
  const errors: string[] = [];

  if (goals.length > RULE_MAX_OBJECTIVES_COUNT_BOUNDS) {
    errors.push(`Structural Range Breach: ${goals.length} goals exceed max of 8.`);
  }
  goals.forEach((g, i) => {
    total += g.assignedWeightageFactor;
    if (g.assignedWeightageFactor < RULE_MIN_GOAL_WEIGHTAGE_FLOOR) {
      errors.push(`Underload at goal #${i + 1}: ${(g.assignedWeightageFactor * 100).toFixed(0)}% < 10% floor.`);
    }
  });
  if (Math.abs(total - RULE_TARGET_TOTAL_WEIGHT_MATCH) > 0.0001) {
    errors.push(`Total weight must equal 100% (currently ${(total * 100).toFixed(1)}%).`);
  }
  return {
    isValidationChainPassed: errors.length === 0,
    activeErrorLogsTraceCollection: errors,
    totalWeightPct: Math.round(total * 1000) / 10,
  };
}
