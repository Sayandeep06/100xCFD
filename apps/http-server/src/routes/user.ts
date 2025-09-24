import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';
export const userRouter: Router = express.Router()

// Magic link signup - send magic link to email
userRouter.post('/signup', async (req, res) => {
    try {
        const { email, username } = req.body;

        if (!email || !username) {
            return res.status(400).json({
                message: "Email and username are required"
            });
        }

        // Generate magic link token (in production, use crypto.randomBytes)
        const magicToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // TODO: Send magic link email here
        // await sendMagicLinkEmail(email, magicToken);

        // For demo, return the magic link
        res.status(200).json({
            success: true,
            message: "Magic link sent to email",
            magicLink: `/verify?token=${magicToken}&email=${email}&username=${username}` // Remove in production
        });

    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({
            message: "Error processing signup"
        });
    }
});

// Verify magic link and create user
userRouter.get('/verify', async (req, res) => {
    try {
        const { token, email, username } = req.query;

        if (!token || !email || !username) {
            return res.status(400).json({
                message: "Missing required parameters"
            });
        }

        // TODO: Validate magic link token here

        const userMessage = {
            action: 'create_user',
            data: {
                email: email as string,
                username: username as string,
                startingBalance: 10000
            }
        };

        const redisClient = RedisManager.getInstance();
        const response = await redisClient.publishAndSubscribe(JSON.stringify(userMessage));

        if (response.success) {
            res.status(200).json({
                success: true,
                userId: response.data.userId,
                message: "User created successfully"
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.error || "Failed to create user"
            });
        }

    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({
            message: "Error creating user"
        });
    }
});