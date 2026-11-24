import { TestBed } from '@angular/core/testing';
import { Calificaciones } from './calificaciones';

describe('Calificaciones', () => {
  let service: Calificaciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Calificaciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
