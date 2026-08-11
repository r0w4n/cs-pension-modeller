export type RetirementChartLegendSource = {
  key: string;
  enabled: boolean;
  active: boolean;
};

export function selectRetirementChartLegendKeys(
  sources: RetirementChartLegendSource[],
  hideInactiveEnabledSources: boolean
) {
  return sources
    .filter(
      (source) =>
        source.enabled && (!hideInactiveEnabledSources || source.active)
    )
    .map((source) => source.key);
}
