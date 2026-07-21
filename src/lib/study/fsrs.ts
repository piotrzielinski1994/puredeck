import {
  type Card,
  createEmptyCard,
  default_w,
  type FSRS,
  fsrs,
  GenSeedStrategyWithCardId,
  type Grade,
  generatorParameters,
  Rating,
  type RecordLogItem,
  type ReviewLog,
  State,
  StrategyMode,
} from "ts-fsrs";

export type { Card, Grade, ReviewLog };
export { Rating, State };
export type ReviewMap = Record<string, Card>;

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
  scheduler.useStrategy(
    StrategyMode.SEED,
    GenSeedStrategyWithCardId(SEED_FIELD),
  );
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
