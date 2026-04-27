import { describe, expect, it } from "vitest";

import { formatDisplayDate, formatDisplayDateTime, formatShortDisplayDate } from "./dateFormatting";

describe("dateFormatting", () => {
  it("formats empty date values consistently", () => {
    expect(formatDisplayDate(null)).toBe("—");
    expect(formatDisplayDateTime(undefined)).toBe("—");
    expect(formatShortDisplayDate(null)).toBe("offen");
  });

  it("formats display dates for the German locale", () => {
    expect(formatDisplayDate("2026-04-27")).toMatch(/27\.0?4\.2026/);
  });
});
