import express, { Router } from 'express'
import { RedisManager } from '../RedisManager';

export const assetsRouter: Router = express.Router()

// Get latest price from Redis
assetsRouter.get('/price/latest', async (req, res) => {
    try {
        const redisClient = RedisManager.getInstance();
        const price = await redisClient.getLatestPrice();

        if (price) {
            res.json({
                symbol: 'BTCUSDT',
                price: price,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                message: 'No price data available'
            });
        }
    } catch (error) {
        console.error('Error fetching latest price:', error);
        res.status(500).json({
            message: 'Error fetching price data'
        });
    }
});