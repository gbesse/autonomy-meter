# Methodology and limits

This document defines what the metrics measure and what they do not establish.

Rows are sorted by decision timestamp, with id as a stable tie-breaker. The first 60%
(default) form the tuning sample; the rest form the holdout. All rows with the same timestamp
stay on one side of the boundary. A dataset with no feasible temporal split is rejected.

Candidate thresholds are the unique tuning scores plus 0 and 1. An observation is selected
when its score is greater than or equal to the threshold. A candidate qualifies only if
all selected observations are labeled, the minimum sample size is met, and the upper
endpoint of the two-sided 95% Wilson interval on its error rate is at most maxError.
Among qualifying candidates, maximize selected count; break ties toward stricter thresholds.

That one threshold is then assessed on holdout using the same rules. A failure produces
no recommended threshold. Inspecting the holdout curve and choosing a different threshold
uses up the holdout: collect a new untouched sample for a fresh assessment.

Wilson intervals assume independent, representative binomial observations. Repeated
customers, correlated failures, delayed labels, drift, adversarial input and selective
human review violate or weaken this interpretation. No multiple-comparison correction
or simultaneous per-group guarantee is provided. Tuning eligibility is exploratory;
the held-out check is the independent assessment. Avoid repeatedly evaluating releases
against the same holdout and interpreting its nominal coverage as unchanged.

Missing labels are not counted as correct. Coverage includes all records; error rates use
labeled selected records. A candidate with any selected unlabeled record is ineligible.
This does not remove upstream selection bias: rows omitted from the dataset remain invisible.

Correctness Brier = mean((selected-class probability - observed correctness)^2).
ECE = sum(bin share * abs(mean score - bin accuracy)). ECE alone can be misleading;
use coverage, errors and intervals as well. The tool reports calibration but does not fit it.

Scenario cost = reviewed_count * review_cost + observed_errors * error_cost, only when
all automatic outcomes are labeled. Manual review is assumed correct. Costs are user inputs,
not market prices or realized savings. No claim of causal business impact follows.
