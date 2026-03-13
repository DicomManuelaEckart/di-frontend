import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Spinner } from './spinner';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Spinner', () => {
  let component: Spinner;
  let fixture: ComponentFixture<Spinner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Spinner],
    }).compileComponents();

    fixture = TestBed.createComponent(Spinner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have role="status" for accessibility', () => {
    const el: HTMLElement = fixture.nativeElement;
    const spinner = el.querySelector('.spinner');
    expect(spinner?.getAttribute('role')).toBe('status');
  });

  it('should have an accessible label', () => {
    const el: HTMLElement = fixture.nativeElement;
    const spinner = el.querySelector('.spinner');
    expect(spinner?.getAttribute('aria-label')).toBe('Loading…');
  });

  it('should apply diameter as width and height', () => {
    const el: HTMLElement = fixture.nativeElement;
    const spinner = el.querySelector('.spinner') as HTMLElement;
    expect(spinner.style.width).toBe('40px');
    expect(spinner.style.height).toBe('40px');
  });
});
