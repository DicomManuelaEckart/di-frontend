import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-toast',
  imports: [TranslatePipe],
  templateUrl: './notification-toast.html',
  styleUrl: './notification-toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToast {
  protected readonly notificationService = inject(NotificationService);
  protected readonly notification = this.notificationService.notification;
}
