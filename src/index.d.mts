// Purpose: Describe Autonomy Meter's input, statistics and release assessment for TypeScript.
export interface Observation { id: string; timestamp: string; score: number; prediction: string; label?: string | null; group?: string }
export interface Options { maxError?: number; minSamples?: number; tuneFraction?: number; reviewCost?: number; errorCost?: number }
export interface Metrics { threshold: number | null; total: number; automated: number; reviewed: number; coverage: number; labeledAutomated: number; unlabeledAutomated: number; errors: number; observedErrorRate: number | null; errorUpper95: number | null; estimatedCost: number | null; manualReviewCost: number }
export interface Calibration { labeled: number; unlabeled: number; correctnessBrier: number | null; expectedCalibrationError: number | null; bins: { lower: number; upper: number; count: number; meanScore: number | null; accuracy: number | null }[] }
export interface Report { schemaVersion: 1; assumptions: Record<string, string | number>; split: { total: number; tuning: number; holdout: number; holdoutStartsAt: string }; recommendation: { status: 'holdout_passed' | 'no_eligible_threshold' | 'holdout_failed'; threshold: number | null; candidateThreshold: number | null }; tuning: Metrics; holdout: Metrics; calibration: Calibration; groups: (Metrics & { group: string })[]; curve: Metrics[]; caveats: string[] }
export function validateRows(rows: unknown): Observation[];
export function parseJSONL(text: string): Observation[];
export function metrics(rows: Observation[], threshold: number | null, options?: Pick<Options, 'reviewCost' | 'errorCost'>): Metrics;
export function calibration(rows: Observation[], bins?: number): Calibration;
export function wilsonUpper(errors: number, count: number): number | null;
export function analyze(rows: Observation[], options?: Options): Report;
export function fromDecisionRecord(record: { id: string; timestamp: string; answers: Record<string, unknown> }, options: { question: string; label?: string; group?: string }): Observation;
