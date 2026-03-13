import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlueprintList } from './blueprint-list';
import { BlueprintService } from '../../services/blueprint.service';

describe('BlueprintList', () => {
  let component: BlueprintList;
  let fixture: ComponentFixture<BlueprintList>;
  let service: BlueprintService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlueprintList],
    }).compileComponents();

    service = TestBed.inject(BlueprintService);
    fixture = TestBed.createComponent(BlueprintList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when no articles', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No articles found');
  });

  it('should display article count from service', () => {
    service.setArticles([
      { articleId: '1', name: 'First', description: 'Desc 1' },
      { articleId: '2', name: 'Second', description: 'Desc 2' },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2 of 2 articles');
  });

  it('should display loading state', () => {
    service.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading');
  });
});
