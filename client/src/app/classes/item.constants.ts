export const ITEM_STATUSES = [
  {value: 'WANT', label: 'Want'},
  {value: 'BOUGHT', label: 'Bought'},
  {value: 'ASSEMBLED', label: 'Assembled'},
  {value: 'WIP', label: 'WIP'},
  {value: 'FINISHED', label: 'Finished'},
] as const;

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'CZK'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const STATUS_ORDER = ITEM_STATUSES.map(s => s.value);

export const STATUS_LABELS = Object.fromEntries(ITEM_STATUSES.map(s => [s.value, s.label]));
