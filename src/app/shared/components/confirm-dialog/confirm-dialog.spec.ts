import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { ConfirmDialog } from './confirm-dialog';
import { DialogRef } from '../../../core/services/dialog.service';

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;
  let closeSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    closeSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    component.dialogRef = {
      closed: new (await import('rxjs')).Subject(),
      close: closeSpy,
    } as unknown as DialogRef<boolean>;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call close with true on confirm', () => {
    component.onConfirm();
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('should call close with false on cancel', () => {
    component.onCancel();
    expect(closeSpy).toHaveBeenCalledWith(false);
  });
});
