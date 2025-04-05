import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';

router.post('/register', authController.register);
router.post('/otp', authController.genOtpAndEmail);
router.post('/verifyOtp', authController.verifyOTPToken);

export default router;