import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Customized, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AuswertungsSerie } from "../../shared/types/api";
import {
  buildAxisDomain,
  buildChartData,
  buildChartLineGroups,
  buildPersonChartData,
  buildRangeMarkers,
  buildYAxisScale,
  formatLegendItemLabel,
  formatYAxisTick
} from "./auswertungChartData";
import { formatTimestamp, formatTooltipValue } from "./auswertungFormatting";
import type {
  CustomizedChartProps,
  DiagrammDarstellung,
  RangeMarker,
  VertikalachsenModus,
  ZeitraumDarstellung
} from "./auswertungTypes";

function RangeMarkersOverlay({
  chartProps,
  markers,
  hiddenGroupIds
}: {
  chartProps: CustomizedChartProps;
  markers: RangeMarker[];
  hiddenGroupIds: Set<string>;
}) {
  const xAxis = Object.values(chartProps.xAxisMap ?? {})[0];
  const yAxis = Object.values(chartProps.yAxisMap ?? {})[0];
  const xScale = xAxis?.scale;
  const yScale = yAxis?.scale;
  const offset = chartProps.offset;

  if (!xScale || !yScale || !offset) {
    return null;
  }

  return (
    <g className="trend-range-markers" aria-hidden="true">
      {markers.map((marker) => {
        const groupId = `${marker.kind}__${marker.personId}`;
        if (hiddenGroupIds.has(groupId)) {
          return null;
        }

        const x = xScale(marker.timestamp);
        const lowerY = marker.lower !== null ? yScale(marker.lower) : offset.top + offset.height;
        const upperY = marker.upper !== null ? yScale(marker.upper) : offset.top;
        const top = Math.min(lowerY, upperY);
        const bottom = Math.max(lowerY, upperY);
        const markerWidth = marker.kind === "laborreferenz" ? 14 : 8;
        const halfWidth = markerWidth / 2;
        const strokeDasharray = marker.kind === "laborreferenz" ? undefined : "2 3";
        const isOpenToTop = marker.lower !== null && marker.upper === null;
        const isOpenToBottom = marker.lower === null && marker.upper !== null;
        const arrowHalfWidth = marker.kind === "laborreferenz" ? 5 : 4;

        return (
          <g key={marker.id} className={`trend-range-marker trend-range-marker--${marker.kind}`}>
            {marker.lower !== null && marker.upper !== null ? (
              <rect
                x={x - halfWidth}
                y={top}
                width={markerWidth}
                height={Math.max(bottom - top, 1)}
                fill={marker.color}
                opacity={marker.kind === "laborreferenz" ? 0.13 : 0.09}
                rx={2}
              />
            ) : null}
            <line
              x1={x}
              x2={x}
              y1={top}
              y2={bottom}
              stroke={marker.color}
              strokeWidth={marker.kind === "laborreferenz" ? 1.6 : 1.2}
              strokeDasharray={strokeDasharray}
              opacity={0.9}
            />
            {marker.lower !== null ? (
              <line
                x1={x - halfWidth}
                x2={x + halfWidth}
                y1={lowerY}
                y2={lowerY}
                stroke={marker.color}
                strokeWidth={marker.kind === "laborreferenz" ? 1.8 : 1.4}
                strokeDasharray={strokeDasharray}
              />
            ) : null}
            {marker.upper !== null ? (
              <line
                x1={x - halfWidth}
                x2={x + halfWidth}
                y1={upperY}
                y2={upperY}
                stroke={marker.color}
                strokeWidth={marker.kind === "laborreferenz" ? 1.8 : 1.4}
                strokeDasharray={strokeDasharray}
              />
            ) : null}
            {isOpenToTop ? (
              <path
                d={`M ${x} ${offset.top} L ${x - arrowHalfWidth} ${offset.top + 9} L ${x + arrowHalfWidth} ${
                  offset.top + 9
                } Z`}
                fill={marker.color}
                opacity={0.9}
              />
            ) : null}
            {isOpenToBottom ? (
              <path
                d={`M ${x} ${offset.top + offset.height} L ${x - arrowHalfWidth} ${
                  offset.top + offset.height - 9
                } L ${x + arrowHalfWidth} ${offset.top + offset.height - 9} Z`}
                fill={marker.color}
                opacity={0.9}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function renderOperatorDot(props: {
  cx?: number;
  cy?: number;
  fill?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}) {
  const { cx, cy, fill = "#1f5a92", dataKey, payload } = props;
  if (typeof cx !== "number" || typeof cy !== "number" || typeof dataKey !== "string") {
    return <circle cx={0} cy={0} r={0} fill="transparent" stroke="transparent" />;
  }

  const operator = payload?.[`${dataKey}__operator`];
  if (operator === "kleiner_als" || operator === "kleiner_gleich") {
    return <path d={`M ${cx} ${cy + 7} L ${cx - 7} ${cy - 5} L ${cx + 7} ${cy - 5} Z`} fill={fill} stroke={fill} />;
  }
  if (operator === "groesser_als" || operator === "groesser_gleich") {
    return <path d={`M ${cx} ${cy - 7} L ${cx - 7} ${cy + 5} L ${cx + 7} ${cy + 5} Z`} fill={fill} stroke={fill} />;
  }
  if (operator === "ungefaehr") {
    return <path d={`M ${cx} ${cy - 7} L ${cx - 7} ${cy} L ${cx} ${cy + 7} L ${cx + 7} ${cy} Z`} fill={fill} stroke={fill} />;
  }
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke={fill} />;
}

export function AuswertungChart({
  serie,
  diagrammDarstellung,
  zeitraumDarstellung,
  vertikalachsenModus,
  datumVon,
  datumBis,
  includeLaborreferenz,
  includeZielbereich
}: {
  serie: AuswertungsSerie;
  diagrammDarstellung: DiagrammDarstellung;
  zeitraumDarstellung: ZeitraumDarstellung;
  vertikalachsenModus: VertikalachsenModus;
  datumVon: string;
  datumBis: string;
  includeLaborreferenz: boolean;
  includeZielbereich: boolean;
}) {
  const chartData = useMemo(() => buildChartData(serie.punkte), [serie.punkte]);
  const people = useMemo(() => buildPersonChartData(serie.punkte), [serie.punkte]);
  const rangeMarkers = useMemo(() => buildRangeMarkers(serie.punkte, people), [people, serie.punkte]);
  const [hiddenLineGroups, setHiddenLineGroups] = useState<Set<string>>(() => new Set());
  const connectPersonPoints = diagrammDarstellung === "verlauf";
  const showReferenceAreas = diagrammDarstellung !== "punkte";
  const yAxisScale = useMemo(
    () =>
      buildYAxisScale(
        serie.punkte,
        vertikalachsenModus,
        includeLaborreferenz && showReferenceAreas,
        includeZielbereich && showReferenceAreas
      ),
    [includeLaborreferenz, includeZielbereich, serie.punkte, showReferenceAreas, vertikalachsenModus]
  );
  const lineGroups = useMemo(
    () => buildChartLineGroups(people, includeLaborreferenz, includeZielbereich, showReferenceAreas),
    [includeLaborreferenz, includeZielbereich, people, showReferenceAreas]
  );
  const visibleLineGroups = lineGroups.filter((group) => !hiddenLineGroups.has(group.id));
  const axisDomain = buildAxisDomain(zeitraumDarstellung, datumVon, datumBis);

  useEffect(() => {
    const availableGroupIds = new Set(lineGroups.map((group) => group.id));
    setHiddenLineGroups((current) => new Set([...current].filter((groupId) => availableGroupIds.has(groupId))));
  }, [lineGroups]);

  if (!chartData.length) {
    return <p>Für diesen Parameter gibt es aktuell keine numerischen Punkte für ein Diagramm.</p>;
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ccb9" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={axisDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => (typeof value === "number" ? formatTimestamp(value) : "")}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={yAxisScale?.domain}
            ticks={yAxisScale?.ticks}
            tickFormatter={(value) => formatYAxisTick(value, yAxisScale?.step)}
          />
          <Tooltip
            labelFormatter={(label) => (typeof label === "number" ? formatTimestamp(label) : String(label))}
            formatter={(value, name, item) => {
              const dataKey = item?.dataKey;
              if (typeof dataKey === "string") {
                const displayValue = item?.payload?.[`${dataKey}__display`];
                if (typeof displayValue === "string") {
                  return [displayValue, name];
                }
              }
              return [formatTooltipValue(value), String(name)];
            }}
          />
          {showReferenceAreas ? (
            <Customized
              component={(props: CustomizedChartProps) => (
                <RangeMarkersOverlay chartProps={props} markers={rangeMarkers} hiddenGroupIds={hiddenLineGroups} />
              )}
            />
          ) : null}
          {visibleLineGroups.map((group) => {
            if (group.kind !== "wert") {
              return null;
            }

            const personId = group.id.replace("wert__", "");
            return (
              <Line
                key={group.id}
                type="monotone"
                dataKey={`wert__${personId}`}
                name={group.label}
                stroke={group.color}
                strokeWidth={connectPersonPoints ? 3 : 0}
                connectNulls={connectPersonPoints}
                dot={(props) => renderOperatorDot({ ...props, fill: group.color })}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <div className="trend-legend" aria-label="Diagrammlinien ein- und ausblenden">
        {people.map((person) => {
          const personGroups = lineGroups.filter((group) => group.personId === person.id);
          if (!personGroups.length) {
            return null;
          }

          return (
            <div className="trend-legend__group" key={person.id}>
              <span className="trend-legend__group-label">{person.name}</span>
              <div className="trend-legend__group-items">
                {personGroups.map((group) => {
                  const isHidden = hiddenLineGroups.has(group.id);
                  return (
                    <button
                      type="button"
                      key={group.id}
                      className={`trend-legend__item ${isHidden ? "trend-legend__item--muted" : ""}`}
                      onClick={() =>
                        setHiddenLineGroups((current) => {
                          const next = new Set(current);
                          if (next.has(group.id)) {
                            next.delete(group.id);
                          } else {
                            next.add(group.id);
                          }
                          return next;
                        })
                      }
                      aria-pressed={!isHidden}
                    >
                      <span
                        className={`trend-legend__swatch trend-legend__swatch--${group.kind}`}
                        style={{ backgroundColor: group.color }}
                        aria-hidden="true"
                      />
                      {formatLegendItemLabel(group)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
