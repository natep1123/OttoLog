export type MainTab = 'home' | 'create' | 'library' | 'account';

export const mainTabs: Array<{
  key: MainTab;
  label: string;
  icon: 'home' | 'plus-circle' | 'book-open' | 'user';
}> = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'create', label: 'Create', icon: 'plus-circle' },
  { key: 'library', label: 'Library', icon: 'book-open' },
  { key: 'account', label: 'Account', icon: 'user' },
];
