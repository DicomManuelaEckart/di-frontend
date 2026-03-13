import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { BlueprintDetail } from './blueprint-detail';

describe('BlueprintDetail', () => {
  let component: BlueprintDetail;
  let componentRef: ComponentRef<BlueprintDetail>;
  let fixture: ComponentFixture<BlueprintDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlueprintDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(BlueprintDetail);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'test-123');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the article ID', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('test-123');
  });
});
