import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  IgxDialogComponent,
  IgxDialogTitleDirective,
  IgxDialogActionsDirective,
} from '@infragistics/igniteui-angular/dialog';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

@Component({
  selector: 'app-confirm-dialog',
  imports: [
    IgxDialogComponent,
    IgxDialogTitleDirective,
    IgxDialogActionsDirective,
    IgxIconComponent,
  ],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly title = input('Bestätigung');
  readonly message = input('Sind Sie sicher?');
  readonly confirmLabel = input('OK');
  readonly cancelLabel = input('Abbrechen');

  readonly confirmed = output<boolean>();

  onConfirm(): void {
    this.confirmed.emit(true);
  }

  onCancel(): void {
    this.confirmed.emit(false);
  }
}
