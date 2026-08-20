import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeMilestoneKey,
  VisibleRetirementIncomeMilestone,
} from "../result-projection/retirement-income-chart-model";
import { snapToLimit } from "./chart-drag-constraints";

export type RetirementIncomeMobileNavigationProps = {
  isCompact: boolean;
  isVisible: boolean;
  limits: RetirementIncomeChartLimits;
  selectedMobileMarker: VisibleRetirementIncomeMilestone | undefined;
  visibleMilestoneMarkers: VisibleRetirementIncomeMilestone[];
  onChangeParameters: (patch: Partial<RetirementIncomeChartParameters>) => void;
  onSelectMobileMarker: (key: RetirementIncomeMilestoneKey) => void;
  onToggleVisibility: () => void;
};

export function RetirementIncomeMobileNavigation({
  isCompact,
  isVisible,
  limits,
  selectedMobileMarker,
  visibleMilestoneMarkers,
  onChangeParameters,
  onSelectMobileMarker,
  onToggleVisibility,
}: RetirementIncomeMobileNavigationProps) {
  if (!selectedMobileMarker || !isCompact) {
    return null;
  }

  const markerLimit = limits[selectedMobileMarker.key];

  return (
    <>
      <button
        type="button"
        className="retirement-income-mobile-navigation-toggle"
        aria-expanded={isVisible}
        onClick={onToggleVisibility}
      >
        {isVisible ? "Hide chart controls" : "Show chart controls"}
      </button>
      {isVisible ? (
        <div className="retirement-income-mobile-navigation">
          <label>
            <span>Chart section</span>
            <select
              className="select-input"
              value={selectedMobileMarker.key}
              onChange={(event) =>
                onSelectMobileMarker(
                  event.target.value as RetirementIncomeMilestoneKey
                )
              }
            >
              {visibleMilestoneMarkers.map((marker) => (
                <option key={marker.key} value={marker.key}>
                  {marker.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Age</span>
            <input
              className="number-input"
              type="number"
              min={markerLimit.min}
              max={markerLimit.max}
              step={markerLimit.step}
              value={selectedMobileMarker.age.toString()}
              disabled={!selectedMobileMarker.editable}
              onChange={(event) =>
                onChangeParameters({
                  [selectedMobileMarker.key]: snapToLimit(
                    Number(event.target.value),
                    markerLimit
                  ),
                })
              }
            />
          </label>
          <input
            aria-label={`Chart ${selectedMobileMarker.label} age`}
            type="range"
            min={markerLimit.min}
            max={markerLimit.max}
            step={markerLimit.step}
            value={selectedMobileMarker.age}
            disabled={!selectedMobileMarker.editable}
            onChange={(event) =>
              onChangeParameters({
                [selectedMobileMarker.key]: snapToLimit(
                  Number(event.target.value),
                  markerLimit
                ),
              })
            }
          />
        </div>
      ) : null}
    </>
  );
}
