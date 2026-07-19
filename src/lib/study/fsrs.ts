import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  GenSeedStrategyWithCardId,
  Rating,
  State,
  StrategyMode,
  default_w,
  type Card,
  type FSRS,
  type Grade,
  type RecordLogItem,
  type ReviewLog,
} from "ts-fsrs";

export { Rating, State };
export type { Card, Grade, ReviewLog };

const REQUEST_RETENTION = 0.9;
const MAXIMUM_INTERVAL = 36500;
const SEED_FIELD = "cid";

export function createScheduler(): FSRS {
  const scheduler = fsrs(
    generatorParameters({
      w: default_w,
      request_retention: REQUEST_RETENTION,
      maximum_interval: MAXIMUM_INTERVAL,
      enable_fuzz: true,
      enable_short_term: true,
    }),
  );
  scheduler.useStrategy(StrategyMode.SEED, GenSeedStrategyWithCardId(SEED_FIELD));
  return scheduler;
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

export function gradeReview(
  scheduler: FSRS,
  card: Card,
  rating: Grade,
  cid: string,
  now: Date,
): RecordLogItem {
  const seeded: Card & Record<typeof SEED_FIELD, string> = {
    ...card,
    [SEED_FIELD]: cid,
  };
  return scheduler.next(seeded, now, rating);
}
