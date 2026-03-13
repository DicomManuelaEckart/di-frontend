import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { DialogService } from './dialog.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAnimationsAsync()],
    });
    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open a dialog and return a DialogRef', () => {
    const ref = service.open(ConfirmDialog, { message: 'Test' });
    expect(ref).toBeTruthy();
    expect(ref.closed).toBeTruthy();
    ref.close();
  });

  it('should emit result on close', () => {
    const ref = service.open<string>(ConfirmDialog);
    let result: string | undefined;
    ref.closed.subscribe((r) => (result = r));
    ref.close('done');
    expect(result).toBe('done');
  });

  it('should return confirm observable', () => {
    let confirmed: boolean | undefined;
    service.confirm('Are you sure?').subscribe((r) => (confirmed = r));
    // The confirm dialog is opened and closed automatically when user acts
    // Since we can't interact with DOM in unit test, we verify the observable was created
    expect(confirmed).toBeUndefined(); // dialog is open, waiting for interaction
  });
});
