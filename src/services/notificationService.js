/**
 * Notification Service
 * Manages user alerts, potential match detection notices, and download request logs.
 */
import { mockDelay, USE_MOCK } from './api';
import { mockNotifications } from '../data/mockData';

let currentNotifications = [...mockNotifications];

export const notificationService = {
  async getNotifications() {
    if (USE_MOCK) {
      await mockDelay(250);
      return [...currentNotifications];
    }
    // Remote endpoint: GET /api/notifications
  },

  async markAsRead(notificationId) {
    if (USE_MOCK) {
      currentNotifications = currentNotifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      return true;
    }
    // Remote endpoint: PATCH /api/notifications/:id/read
  },

  async markAllAsRead() {
    if (USE_MOCK) {
      currentNotifications = currentNotifications.map(n => ({ ...n, isRead: true }));
      return true;
    }
    // Remote endpoint: POST /api/notifications/mark-all-read
  },

  async dismissNotification(notificationId) {
    if (USE_MOCK) {
      currentNotifications = currentNotifications.filter(n => n.id !== notificationId);
      return true;
    }
    // Remote endpoint: DELETE /api/notifications/:id
  }
};

export default notificationService;
