import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { BlueprintDetail } from './blueprint-detail';
import { BlueprintService } from '../../services/blueprint.service';

describe('BlueprintDetail', () => {
  let component: BlueprintDetail;
  let componentRef: ComponentRef<BlueprintDetail>;
  let fixture: ComponentFixture<BlueprintDetail>;
  let service: BlueprintService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlueprintDetail],
    }).compileComponents();

    service = TestBed.inject(BlueprintService);
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

  it('should display article name when article exists in service', () => {
    service.setArticles([
      { articleId: 'test-123', name: 'My Article', description: 'A description' },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('My Article');
    expect(compiled.textContent).toContain('A description');
  });

  it('should fall back to id when article is not found', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('test-123');
  });
});
