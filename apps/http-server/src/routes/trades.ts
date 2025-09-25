import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';
export const tradesRouter: Router = express.Router()

tradesRouter.post('/trade', async (req, res) => {
    try {
        const { asset, type, margin, leverage} = req.body;

        if (!asset || !type || !margin || !leverage) {
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
                userId: 1, 
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