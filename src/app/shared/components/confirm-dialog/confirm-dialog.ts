import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IgxDialogComponent,
  IgxDialogActionsDirective,
} from '@infragistics/igniteui-angular/dialog';

import { DialogRef } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [IgxDialogComponent, IgxDialogActionsDirective],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  title = 'Confirm';
  message = 'Are you sure?';
  dialogRef!: DialogRef<boolean>;

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
