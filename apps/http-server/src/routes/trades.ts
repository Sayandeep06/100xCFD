import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';
import { TradingEngine } from 'engine';
export const tradesRouter: Router = express.Router()

tradesRouter.get('/positions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching positions for userId:', userId);

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const tradingEngine = TradingEngine.getInstance();
        const positions = tradingEngine.getUserPositions(parseInt(userId));
        console.log('Found positions:', positions);

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

tradesRouter.post('/close', async (req, res) => {
    try {
        const { userId, positionId } = req.body;

        if (!userId || !positionId) {
            return res.status(400).json({
                message: "Missing required fields: userId, positionId"
            });
        }

        const tradingEngine = TradingEngine.getInstance();
        const closedPosition = tradingEngine.closePosition(positionId, parseInt(userId));

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

tradesRouter.post('/trade', async (req, res) => {
    try {
        const { userId, asset, type, margin, leverage} = req.body;

        if (!userId || !asset || !type || !margin || !leverage) {
            return res.status(400).json({
                message: "Missing required fields: userId, asset, type, margin, leverage"
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
                userId: parseInt(userId),
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
                orderId: response.data.positionId, // For backward compatibility
                message: `${type.toUpperCase()} order placed successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.error || "Failed to place order"
            });
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(411).json({
            message: "Error processing order"
        });
    }
});

// Test endpoint for liquidation testing
tradesRouter.post('/test-price-update', async (req, res) => {
    try {
        const { symbol, price } = req.body;

        if (!symbol || !price) {
            return res.status(400).json({
                message: "Missing required fields: symbol, price"
            });
        }

        const tradingEngine = TradingEngine.getInstance();
        tradingEngine.testPriceUpdate(symbol, parseFloat(price));

        res.status(200).json({
            success: true,
            message: `Price updated to ${price} for ${symbol}`,
            newPrice: parseFloat(price)
        });

    } catch (error) {
        console.error('Error updating test price:', error);
        res.status(500).json({
            message: "Error updating test price"
        });
    }
});