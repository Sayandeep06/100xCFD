import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';
import { TradingEngine } from 'engine';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const tradesRouter: Router = express.Router()

tradesRouter.use(authMiddleware);

tradesRouter.get('/positions', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const tradingEngine = TradingEngine.getInstance();
        const positions = await tradingEngine.getUserPositions(parseInt(userId));

        res.status(200).json({
            success: true,
            positions: positions
        });

    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({
            message: "Error fetching positions"
        });
    }
});

tradesRouter.post('/close', async (req: AuthRequest, res) => {
    try {
        const { positionId } = req.body;
        const userId = req.userId;

        if (!userId || !positionId) {
            return res.status(400).json({
                message: "Missing required fields: positionId"
            });
        }

        const tradingEngine = TradingEngine.getInstance();
        const closedPosition = await tradingEngine.closePosition(positionId, parseInt(userId));

        if (closedPosition) {
            res.status(200).json({
                success: true,
                message: "Position closed successfully",
                position: closedPosition
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Failed to close position"
            });
        }

    } catch (error) {
        console.error('Error closing position:', error);
        res.status(500).json({
            message: "Error closing position"
        });
    }
});

tradesRouter.post('/trade', async (req: AuthRequest, res) => {
    try {
        const { asset, type, margin, leverage } = req.body;
        const userId = req.userId;

        if (!userId || !asset || !type || !margin || !leverage) {
            return res.status(400).json({
                message: "Missing required fields: asset, type, margin, leverage"
            });
        }

        if (!['buy', 'sell'].includes(type)) {
            return res.status(400).json({
                message: "Type must be 'buy' or 'sell'"
            });
        }

        const orderMessage = {
            action: 'place_order',
            data: {
                userId: parseInt(userId!),
                symbol: asset.toUpperCase(),
                side: type,
                margin: parseFloat(margin),
                leverage: parseInt(leverage),
            }
        };

        const redisClient = RedisManager.getInstance();
        const response = await redisClient.publishAndSubscribe(JSON.stringify(orderMessage));

        if (response.success) {
            res.status(200).json({
                success: true,
                positionId: response.data.positionId,
                orderId: response.data.positionId,
                message: `${type.toUpperCase()} order placed successfully`
            });
        } else {
            console.error('HTTP Server: Order placement failed:', response.error);
            res.status(400).json({
                success: false,
                message: response.error || "Failed to place order"
            });
        }

    } catch (error) {
        console.error('HTTP Server: Error placing order:', error);
        const errorMessage = error instanceof Error ? error.message : "Error processing order";
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});