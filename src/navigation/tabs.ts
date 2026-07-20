export type MainTab = 'home' | 'insights' | 'create' | 'library' | 'account';

export const mainTabs: Array<{
  key: MainTab;
  label: string;
  icon: 'home' | 'bar-chart-2' | 'plus-circle' | 'book-open' | 'user';
}> = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'insights', label: 'Insights', icon: 'bar-chart-2' },
  { key: 'create', label: 'Create', icon: 'plus-circle' },
  { key: 'library', label: 'Library', icon: 'book-open' },
  { key: 'account', label: 'Account', icon: 'user' },
];
