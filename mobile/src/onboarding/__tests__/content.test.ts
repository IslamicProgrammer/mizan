import { LANGUAGES } from '../content';

describe('LANGUAGES', () => {
  it('ships exactly one selectable language in v1', () => {
    expect(LANGUAGES.filter((l) => !l.soon).map((l) => l.key)).toEqual(['uz']);
  });

  it('still lists the languages that are coming, so the plan is visible', () => {
    expect(LANGUAGES.map((l) => l.key)).toEqual(['uz', 'ru', 'en']);
  });
});
