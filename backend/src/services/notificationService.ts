import { logger } from '../utils/logger';

export interface CircleNotification {
  type: 'CIRCLE_CREATED' | 'ROUND_STARTED' | 'BID_PLACED' | 'ROUND_SETTLED' | 'DEFAULT_WARNING';
  circleId: number;
  recipient?: string;
  payload: Record<string, any>;
  timestamp: string;
}

class NotificationService {
  private subscribers: Array<(notification: CircleNotification) => void> = [];

  subscribe(callback: (notification: CircleNotification) => void) {
    this.subscribers.push(callback);
  }

  dispatch(notification: CircleNotification) {
    logger.info(`[Notification] ${notification.type} for Circle #${notification.circleId}`, {
      notification,
    });

    for (const sub of this.subscribers) {
      try {
        sub(notification);
      } catch (err) {
        logger.error('Error dispatching notification to subscriber', { err });
      }
    }
  }
}

export const notificationService = new NotificationService();
