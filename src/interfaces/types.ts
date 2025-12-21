export type Update<T> = Partial<T>;

export type Result<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; error: E };
