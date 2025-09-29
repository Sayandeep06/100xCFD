import express, { Router } from 'express'
import { TradingEngine } from 'engine';
export const userRouter: Router = express.Router()

userRouter.post('/signup', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({
                message: "Email, username, and password are required"
            });
        }

        const existingUser = TradingEngine.getInstance().findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists"
            });
        }

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

userRouter.get('/data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const user = TradingEngine.getInstance().getUser(parseInt(userId));

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