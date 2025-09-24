import {createClient, RedisClientType} from "redis";
import {TradingEngine} from "./TradingEngine";

interface OrderData {
    userId: number;
    symbol: string;
    side: 'buy' | 'sell';
    margin: number;
    leverage: number;
}

interface OrderMessage {
    action: 'place_order';
    data: OrderData;
}

interface QueueMessage {
    id: string;
    message: string;
}

interface UserData {
    email: string;
    username: string;
    startingBalance: number;
}

interface UserMessage {
    action: 'create_user';
    data: UserData;
}
export class RedisManager{
    private static instance: RedisManager;
    private client: RedisClientType;
    constructor(){
        this.client = createClient();
        this.client.connect();
    }
    public static getInstance(){
        if(!RedisManager.instance){
            RedisManager.instance = new RedisManager()
        }return RedisManager.instance
    }
    private addOrder(){
        const interval = setInterval( async() => {
            try {
                const queueData = await this.client.rPop('Order')
                if (!queueData) return;

                const queueMessage: QueueMessage = JSON.parse(queueData)
                const orderMessage: OrderMessage = JSON.parse(queueMessage.message)
                const order = orderMessage.data

                await TradingEngine.getInstance().placeOrder(order.userId, order.symbol, order.side, order.margin, order.leverage)
            } catch (error) {
                console.error('Error processing order:', error)
            }
        },1000)
    }

    public startOrderProcessing() {
        this.addOrder();
    }
    private addUser(){
        const interval = setInterval( async() => {
            try {
                const queueData = await this.client.rPop('User')
                if (!queueData) return;

                const queueMessage: QueueMessage = JSON.parse(queueData)
                const userMessage: UserMessage = JSON.parse(queueMessage.message)
                const userData = userMessage.data

                // Generate unique userId (in production, use better ID generation)
                const userId = Date.now();

                const user = TradingEngine.getInstance().createUser(userId, userData.username, userData.startingBalance)

                // Respond back to HTTP server via Redis pub/sub
                await this.client.publish(queueMessage.id, JSON.stringify({
                    success: true,
                    data: { userId: user.userId, username: user.username }
                }))

            } catch (error) {
                console.error('Error processing user creation:', error)
                // TODO: Send error response back via Redis pub/sub if needed
            }
        },1000)
    }

    public startUserProcessing() {
        this.addUser();
    }
}