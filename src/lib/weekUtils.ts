import { getISOWeek, getISOWeekYear, addWeeks } from "date-fns";

export function getCurrentWeek(): { week: number; year: number } {
  const now = new Date();
  return {
    week: getISOWeek(now),
    year: getISOWeekYear(now),
  };
}

export function getPreviousWeek(): { week: number; year: number } {
  const prevWeekDate = addWeeks(new Date(), -1);
  return {
    week: getISOWeek(prevWeekDate),
    year: getISOWeekYear(prevWeekDate),
  };
}

export function getNextWeek(): { week: number; year: number } {
  const nextWeekDate = addWeeks(new Date(), 1);
  return {
    week: getISOWeek(nextWeekDate),
    year: getISOWeekYear(nextWeekDate),
  };
}

