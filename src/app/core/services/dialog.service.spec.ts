import { TestBed } from '@angular/core/testing';

import { DialogService } from './dialog.service';
import { firstValueFrom } from 'rxjs';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be provided in root', () => {
    const injected = TestBed.inject(DialogService);
    expect(injected).toBe(service);
  });

  it('should return observable from confirm', async () => {
    const result = await firstValueFrom(service.confirm('Delete this item?'));
    expect(result).toBe(false);
  });

  it('should accept custom title in confirm', async () => {
    const result = await firstValueFrom(service.confirm('Are you sure?', 'Custom Title'));
    expect(typeof result).toBe('boolean');
  });

  it('should have null viewContainerRef initially', () => {
    expect(service.getViewContainerRef()).toBeNull();
  });
});
