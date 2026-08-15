import { Request, Response } from 'express';
import { adminMessaging, adminAuth } from '../../../../config/firebaseAdmin.js';

export const sendFirebaseMessageController = async (req: Request, res: Response) => {
  try {
    const { recipient, subject, message, token } = req.body;

    console.log(`[Firebase Notification] Processing message for ${recipient || 'all devices'}`);

    // If device FCM token is passed, send push message via Firebase Admin Messaging
    if (token) {
      const fcmPayload = {
        notification: {
          title: subject || 'Vamvamvam AI Notification',
          body: message || 'Operational update ready.',
        },
        token,
      };

      const messageId = await adminMessaging.send(fcmPayload);
      return res.status(200).json({
        success: true,
        provider: 'Firebase FCM',
        messageId,
        details: 'Push notification dispatched via Firebase Admin Messaging.',
      });
    }

    // If email recipient is provided, generate Firebase Admin magic link or verification email
    if (recipient) {
      const link = await adminAuth.generateEmailVerificationLink(recipient);
      return res.status(200).json({
        success: true,
        provider: 'Firebase Auth Mailer',
        recipient,
        verificationLink: link,
        details: 'Firebase Email dispatch URL generated successfully.',
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Missing recipient email or FCM device token.',
    });
  } catch (error: any) {
    console.error('Firebase Message Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to dispatch message via Firebase Admin',
    });
  }
};
