import express, { Router } from 'express'
import { TradingEngine } from 'engine';
import { RedisManager } from '../RedisManager';
export const userRouter: Router = express.Router()

userRouter.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const userMessage = {
            action: 'create_user',
            data: {
                email: '', 
                username,
                password,
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
        console.error('Error in signup:', error);
        res.status(500).json({
            message: "Error processing signup"
        });
    }
});

userRouter.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = await TradingEngine.getInstance().authenticateUser(username, password);

        if (user) {
            res.status(200).json({
                success: true,
                user: {
                    userId: user.userId,
                    username: user.username,
                    balance: user.balances.usd.available
                },
                message: "Authentication successful"
            });
        } else {
            res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

    } catch (error) {
        console.error('Error in signin:', error);
        res.status(500).json({
            message: "Error processing signin"
        });
    }
});

userRouter.get('/data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const user = await TradingEngine.getInstance().getUser(parseInt(userId));

        if (user) {
            res.status(200).json({
                success: true,
                user: {
                    userId: user.userId,
                    username: user.username,
                    balance: user.balances.usd.available
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({
            message: "Error fetching user data"
        });
    }
});