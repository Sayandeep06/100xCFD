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

interface AuthData {
    username: string;
    password: string;
}

interface AuthMessage {
    action: 'authenticate_user';
    data: AuthData;
}
export class RedisManager{
    private static instance: RedisManager;
    private client: RedisClientType;
    private publisher: RedisClientType;
    private isReady: boolean = false;

    constructor(){
        this.client = createClient();
        this.publisher = createClient();

        this.client.on('error', (err) => console.error('Engine: Redis Client Error:', err));
        this.publisher.on('error', (err) => console.error('Engine: Redis Publisher Error:', err));

        Promise.all([
            this.client.connect(),
            this.publisher.connect()
        ]).then(() => {
            this.isReady = true;
        }).catch(err => {
            console.error('Engine: Failed to connect to Redis:', err);
        });
    }
    public static getInstance(){
        if(!RedisManager.instance){
            RedisManager.instance = new RedisManager()
        }return RedisManager.instance
    }

    public async waitForReady(timeoutMs: number = 10000): Promise<void> {
        const startTime = Date.now();
        while (!this.isReady && Date.now() - startTime < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (!this.isReady) {
            throw new Error('Engine: Redis connection timeout');
        }
    }

    private async processOrders() {
        let orderCount = 0;

        while (true) {
            let queueData: string | null = null;
            try {
                queueData = await this.client.rPop('Order')

                if (!queueData) {
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                    continue;
                }

                orderCount++;

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
                console.error(`Engine: Error processing order #${orderCount}:`, error);
                console.error('Engine: Error stack:', error instanceof Error ? error.stack : 'No stack trace');

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
        }
    }

    private addOrder(){
        this.processOrders();
    }

    public startOrderProcessing() {
        this.addOrder();
    }
    private async processUsers() {
        while (true) {
            let queueData: string | null = null;
            try {
                queueData = await this.client.rPop('User')

                if (!queueData) {
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                    continue;
                }

                const queueMessage: QueueMessage = JSON.parse(queueData)
                const message = JSON.parse(queueMessage.message)

                if (message.action === 'create_user') {
                    const userMessage: UserMessage = message;
                    const userData = userMessage.data;

                    const existingUser = await TradingEngine.getInstance().findUserByUsername(userData.username);
                    if (existingUser) {
                        await this.publisher.publish(queueMessage.id, JSON.stringify({
                            success: false,
                            error: 'Username already exists'
                        }));
                        continue;
                    }

                    const userId = Date.now();
                    const user = await TradingEngine.getInstance().createUser(userId, userData.username, userData.password, userData.startingBalance)

                    await this.publisher.publish(queueMessage.id, JSON.stringify({
                        success: true,
                        data: { userId: user.userId, username: user.username }
                    }));

                } else if (message.action === 'authenticate_user') {
                    const authMessage: AuthMessage = message;
                    const authData = authMessage.data;

                    const user = await TradingEngine.getInstance().authenticateUser(authData.username, authData.password);

                    if (user) {
                        await this.publisher.publish(queueMessage.id, JSON.stringify({
                            success: true,
                            data: {
                                userId: user.userId,
                                username: user.username,
                                balance: user.balances.usd.available
                            }
                        }));
                    } else {
                        await this.publisher.publish(queueMessage.id, JSON.stringify({
                            success: false,
                            error: 'Invalid credentials'
                        }));
                    }
                }

            } catch (error) {
                console.error('Error processing user operation:', error)

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
        }
    }

    private addUser(){
        this.processUsers();
    }

    public startUserProcessing() {
        this.addUser();
    }
}