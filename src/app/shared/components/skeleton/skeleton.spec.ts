import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Skeleton', () => {
  let component: Skeleton;
  let fixture: ComponentFixture<Skeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Skeleton],
    }).compileComponents();

    fixture = TestBed.createComponent(Skeleton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be hidden from assistive technology', () => {
    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('.skeleton');
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should apply default width and height', () => {
    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('.skeleton') as HTMLElement;
    expect(skeleton.style.width).toBe('100%');
    expect(skeleton.style.height).toBe('1rem');
  });
});
