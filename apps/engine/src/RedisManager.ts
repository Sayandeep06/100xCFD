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
    password: string;
    startingBalance: number;
}

interface UserMessage {
    action: 'create_user';
    data: UserData;
}
export class RedisManager{
    private static instance: RedisManager;
    private client: RedisClientType;
    private publisher: RedisClientType
    constructor(){
        this.client = createClient();
        this.client.connect();
        this.publisher = createClient();
        this.publisher.connect()
    }
    public static getInstance(){
        if(!RedisManager.instance){
            RedisManager.instance = new RedisManager()
        }return RedisManager.instance
    }
    private addOrder(){
        const interval = setInterval( async() => {
            let queueData: string | null = null;
            try {
                queueData = await this.client.rPop('Order')

                if (!queueData) return;

                const queueMessage: QueueMessage = JSON.parse(queueData)
                const id = queueMessage.id
                const orderMessage: OrderMessage = JSON.parse(queueMessage.message)
                const order = orderMessage.data

                const position = await TradingEngine.getInstance().placeOrder(order.userId, order.symbol, order.side, order.margin, order.leverage)

                const response = {
                    success: true,
                    data: {
                        positionId: position.positionId,
                        userId: position.userId,
                        symbol: position.symbol,
                        side: position.side,
                        leverage: position.leverage,
                        margin: position.margin,
                        entry_price: position.entry_price
                    }
                }
                await this.publisher.publish(id, JSON.stringify(response))
            } catch (error) {
                console.error('Error processing order:', error)

            
                if (queueData) {
                    try {
                        const queueMessage: QueueMessage = JSON.parse(queueData)
                        const errorResponse = {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error occurred'
                        }
                        await this.publisher.publish(queueMessage.id, JSON.stringify(errorResponse))
                    } catch (publishError) {
                        console.error('Error sending error response:', publishError)
                    }
                }
            }
        },1000)
    }

    public startOrderProcessing() {
        this.addOrder();
    }
    private addUser(){
        setInterval( async() => {
            let queueData: string | null = null;
            try {
                queueData = await this.client.rPop('User')
                if (!queueData) return;

                const queueMessage: QueueMessage = JSON.parse(queueData)
                const userMessage: UserMessage = JSON.parse(queueMessage.message)
                const userData = userMessage.data;

                const existingUser = TradingEngine.getInstance().findUserByUsername(userData.username);
                if (existingUser) {
                    await this.publisher.publish(queueMessage.id, JSON.stringify({
                        success: false,
                        error: 'Username already exists'
                    }));
                    return;
                }

                const userId = Date.now();

                const user = TradingEngine.getInstance().createUser(userId, userData.username, userData.password, userData.startingBalance)

                await this.publisher.publish(queueMessage.id, JSON.stringify({
                    success: true,
                    data: { userId: user.userId, username: user.username }
                }))

            } catch (error) {
                console.error('Error processing user creation:', error)

                if (queueData) {
                    try {
                        const queueMessage: QueueMessage = JSON.parse(queueData)
                        const errorResponse = {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error occurred'
                        }
                        await this.publisher.publish(queueMessage.id, JSON.stringify(errorResponse))
                    } catch (publishError) {
                        console.error('Error sending error response:', publishError)
                    }
                }
            }
        },1000)
    }

    public startUserProcessing() {
        this.addUser();
    }
}