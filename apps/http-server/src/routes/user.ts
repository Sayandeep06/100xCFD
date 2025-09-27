import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';
import { TradingEngine } from '../../../engine/src/TradingEngine';
export const userRouter: Router = express.Router()

// Password-based signup
userRouter.post('/signup', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({
                message: "Email, username, and password are required"
            });
        }

        // Check if username already exists
        const existingUser = TradingEngine.getInstance().findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists"
            });
        }

        // Generate unique userId
        const userId = Date.now();

        const user = TradingEngine.getInstance().createUser(userId, username, password, 10000);

        res.status(200).json({
            success: true,
            userId: user.userId,
            message: "User created successfully"
        });

    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({
            message: "Error processing signup"
        });
    }
});

// Password-based signin
userRouter.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = TradingEngine.getInstance().authenticateUser(username, password);

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