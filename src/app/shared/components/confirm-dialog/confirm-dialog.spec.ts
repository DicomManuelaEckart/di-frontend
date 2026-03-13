import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default title', () => {
    expect(component.title()).toBe('Bestätigung');
  });

  it('should have default message', () => {
    expect(component.message()).toBe('Sind Sie sicher?');
  });

  it('should emit true on confirm', () => {
    let result: boolean | undefined;
    component.confirmed.subscribe((v: boolean) => (result = v));
    component.onConfirm();
    expect(result).toBe(true);
  });

  it('should emit false on cancel', () => {
    let result: boolean | undefined;
    component.confirmed.subscribe((v: boolean) => (result = v));
    component.onCancel();
    expect(result).toBe(false);
  });
});
