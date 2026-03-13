import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlueprintList } from './blueprint-list';

describe('BlueprintList', () => {
  let component: BlueprintList;
  let fixture: ComponentFixture<BlueprintList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlueprintList],
    }).compileComponents();

    fixture = TestBed.createComponent(BlueprintList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
