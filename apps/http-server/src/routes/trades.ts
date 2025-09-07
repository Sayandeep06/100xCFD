import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';
export const tradesRouter: Router = express.Router()

tradesRouter.post('/trade', async (req, res) => {
    try {
        const { asset, type, margin, leverage, orderType} = req.body;
        
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

        const side = type === 'buy' ? 'long' : 'short';
        
        const orderMessage = {
            action: 'place_order',
            data: {
                userId: 1, 
                symbol: asset.toUpperCase(),
                side: side,
                margin: parseFloat(margin),
                leverage: parseInt(leverage),
                orderType: orderType // market order or limit order
            }
        };

        const redisClient = RedisManager.getInstance();
        const response = await redisClient.publishAndSubscribe(JSON.stringify(orderMessage));
        
        if (response.success) {
            res.status(200).json({
                success: true,
                orderId: response.data.orderId,
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