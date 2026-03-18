import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Sidenav } from './sidenav';

describe('Sidenav', () => {
  let component: Sidenav;
  let fixture: ComponentFixture<Sidenav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidenav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidenav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have navigation groups', () => {
    expect(component.navGroups.length).toBeGreaterThan(0);
  });

  it('should render group toggle buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const toggles = compiled.querySelectorAll('.sidenav__group-toggle');
    expect(toggles.length).toBe(component.navGroups.length);
  });

  it('should have Organization group expanded by default', () => {
    expect(component.isExpanded('Organization')).toBe(true);
  });

  it('should render child links when group is expanded', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.sidenav__link');
    const totalChildren = component.navGroups.reduce((sum, g) => sum + g.children.length, 0);
    expect(links.length).toBe(totalChildren);
  });

  it('should collapse group when toggle is clicked', () => {
    component.toggleGroup('Organization');
    fixture.detectChanges();

    expect(component.isExpanded('Organization')).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.sidenav__link');
    expect(links.length).toBe(0);
  });

  it('should re-expand group when toggle is clicked again', () => {
    component.toggleGroup('Organization');
    component.toggleGroup('Organization');
    fixture.detectChanges();

    expect(component.isExpanded('Organization')).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.sidenav__link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should set aria-expanded attribute on group toggle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector('.sidenav__group-toggle');
    expect(toggle!.getAttribute('aria-expanded')).toBe('true');

    component.toggleGroup('Organization');
    fixture.detectChanges();
    expect(toggle!.getAttribute('aria-expanded')).toBe('false');
  });
});
