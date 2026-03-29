import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  refresh,
  forgotPassword,
  getMe,
  changePassword,
} from '../controllers/auth.controller';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/refresh', refresh);

// Authenticated routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/password', authenticate, changePassword);

export default router;
