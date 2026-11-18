import test from "node:test";
import assert from "node:assert/strict";
import { calculateLeaveDays, getLocalTodayString } from "./dateUtils.js";

test("calculateLeaveDays: Monday to Wednesday should calculate 3 working days with 0 weekend days", () => {
  // 2026-11-23 is Monday, 2026-11-25 is Wednesday
  const result = calculateLeaveDays("2026-11-23", "2026-11-25");
  assert.equal(result.workingDays, 3);
  assert.equal(result.calendarDays, 3);
  assert.equal(result.weekendDays, 0);
});

test("calculateLeaveDays: Friday to Monday should calculate 2 working days and exclude 2 weekend days", () => {
  // 2026-11-20 is Friday, 2026-11-23 is Monday
  const result = calculateLeaveDays("2026-11-20", "2026-11-23");
  assert.equal(result.workingDays, 2);
  assert.equal(result.calendarDays, 4);
  assert.equal(result.weekendDays, 2);
});

test("calculateLeaveDays: Saturday to Sunday should calculate 0 working days and 2 weekend days", () => {
  // 2026-11-21 is Saturday, 2026-11-22 is Sunday
  const result = calculateLeaveDays("2026-11-21", "2026-11-22");
  assert.equal(result.workingDays, 0);
  assert.equal(result.calendarDays, 2);
  assert.equal(result.weekendDays, 2);
});

test("calculateLeaveDays: Single Saturday should calculate 0 working days", () => {
  const result = calculateLeaveDays("2026-11-21", "2026-11-21");
  assert.equal(result.workingDays, 0);
  assert.equal(result.calendarDays, 1);
  assert.equal(result.weekendDays, 1);
});

test("calculateLeaveDays: Inverted dates (toDate < fromDate) should return zeros", () => {
  const result = calculateLeaveDays("2026-11-25", "2026-11-20");
  assert.equal(result.workingDays, 0);
  assert.equal(result.calendarDays, 0);
  assert.equal(result.weekendDays, 0);
});

test("calculateLeaveDays: Missing dates should return zeros", () => {
  const result = calculateLeaveDays("", "2026-11-20");
  assert.equal(result.workingDays, 0);
  assert.equal(result.calendarDays, 0);
  assert.equal(result.weekendDays, 0);
});

test("getLocalTodayString: should return valid YYYY-MM-DD pattern", () => {
  const todayStr = getLocalTodayString();
  assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);
});
