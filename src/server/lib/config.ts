export const config = {
  REQUIRE_DAILY_JOURNAL_READ: false,
};

export function setRequireDailyJournalRead(value: boolean): void {
  config.REQUIRE_DAILY_JOURNAL_READ = value;
}
