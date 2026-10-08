import { buildImportPlan } from '../src/domain/csvImport';

const crags = 'key,region,name,country,lat,lng\npodzamcze,Jura,Podzamcze,PL,50.5,19.5\n';
const sectors = 'key,crag_key,name\ncentral,podzamcze,Centralny\n';

describe('csv import', () => {
  it('accepts a valid set', () => {
    const routes = 'key,sector_key,name,type,grade,grade_system\nr1,central,Filar,sport,VI.3,kr\nm1,central,Grań,multipitch,V+,kr\n';
    const pitches = 'route_key,number,grade,grade_system\nm1,1,V,kr\nm1,2,V+,kr\n';
    const plan = buildImportPlan({ crags, sectors, routes, pitches });
    expect(plan.errors).toEqual([]);
    expect(plan.routes).toHaveLength(2);
    expect(plan.pitches).toHaveLength(2);
  });
  it('reports a bad foreign key, grade and system', () => {
    const routes =
      'key,sector_key,name,type,grade,grade_system\n' +
      'a,nope,A,sport,VI.3,kr\n' +
      'b,central,B,sport,9z,fr\n' +
      'c,central,C,boulder,6B,fr\n';
    const plan = buildImportPlan({ crags, sectors, routes });
    expect(plan.errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(plan.routes).toHaveLength(0);
  });
  it('rejects pitches for non-multipitch routes and duplicates', () => {
    const routes = 'key,sector_key,name,type,grade,grade_system\nr1,central,Filar,sport,VI.3,kr\nm1,central,Grań,multipitch,V+,kr\n';
    const pitches = 'route_key,number,grade,grade_system\nr1,1,V,kr\nm1,1,V,kr\nm1,1,V,kr\n';
    const plan = buildImportPlan({ crags, sectors, routes, pitches });
    expect(plan.errors).toHaveLength(2);
  });
});
