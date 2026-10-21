import { planFromFiles, UnknownFileError } from '../src/domain/importPlan';

const head = 'region;area;crag;sector;name;grade\n';
const krowia = `${head}Czarnorzeki;Kamieniec;Krowia;Zachód;Rysa;VI.1\nCzarnorzeki;Kamieniec;Krowia;Zachód;Filar;VI.2\n`;
const baszta = `${head}Jura;Sokoliki;Baszta;;Komin;V\n`;

describe('planFromFiles', () => {
  it('builds a plan from one file', () => {
    const { plan, skipped } = planFromFiles({ 'krowia.csv': krowia });
    expect(plan.errors).toEqual([]);
    expect(plan.crags.map((c) => c.name)).toEqual(['Krowia']);
    expect(plan.routes.map((r) => r.name)).toEqual(['Rysa', 'Filar']);
    expect(skipped).toBe(0);
  });
  it('merges several files into one plan', () => {
    const { plan } = planFromFiles({ 'krowia.csv': krowia, 'baszta.csv': baszta });
    expect(plan.crags.map((c) => c.name)).toEqual(['Krowia', 'Baszta']);
    expect(plan.routes).toHaveLength(3);
  });
  it('names the file and line of each problem and plans nothing then', () => {
    const bad = `${head}Jura;Sokoliki;Baszta;;Komin;9z\n`;
    const { plan } = planFromFiles({ 'krowia.csv': krowia, 'bad.csv': bad });
    expect(plan.errors).toEqual([expect.objectContaining({ file: 'bad.csv', line: 2 })]);
    expect(plan.routes).toEqual([]);
  });
  it('rejects a file it does not recognise, and a positions file', () => {
    expect(() => planFromFiles({ 'x.csv': 'a;b;c\n1;2;3\n' })).toThrow(UnknownFileError);
    expect(() => planFromFiles({ 'pos.csv': 'crag;lat;lng\nKrowia;49.7;21.8\n' })).toThrow(UnknownFileError);
  });
});
