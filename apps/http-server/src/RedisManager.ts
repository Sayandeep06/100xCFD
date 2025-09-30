import { createClient, RedisClientType } from 'redis';

export class RedisManager{
    private static instance: RedisManager;
    private publisher: RedisClientType;
    private subscriber: RedisClientType;
    private isReady: boolean = false;

    constructor(){
        this.publisher = createClient();
        this.subscriber = createClient();

        this.publisher.on('error', (err) => console.error('HTTP Server: Redis Publisher Error:', err));
        this.subscriber.on('error', (err) => console.error('HTTP Server: Redis Subscriber Error:', err));

        Promise.all([
            this.publisher.connect(),
            this.subscriber.connect()
        ]).then(() => {
            this.isReady = true;
        }).catch(err => {
            console.error('HTTP Server: Failed to connect to Redis:', err);
        });
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager();
        }return this.instance
    }

    public async waitForReady(timeoutMs: number = 5000): Promise<void> {
        const startTime = Date.now();
        while (!this.isReady && Date.now() - startTime < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (!this.isReady) {
            throw new Error('Redis connection timeout');
        }
    }
    public async publishAndSubscribe(message: string){
        if (!this.isReady) {
            try {
                await this.waitForReady();
            } catch (error) {
                throw new Error('Redis not connected - cannot process request');
            }
        }

        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const parsedMessage = JSON.parse(message);
        const queueName = parsedMessage.action === 'create_user' ? 'User' : 'Order';

        return new Promise<any>((resolve, reject)=>{
            const timeout = setTimeout(() => {
                this.subscriber.unsubscribe(id).catch(err => console.error('Unsubscribe error:', err));
                console.error(`HTTP Server: Timeout waiting for response from engine (id: ${id})`);
                reject(new Error('Engine response timeout - ensure engine service is running'));
            }, 10000); 

            this.subscriber.subscribe(id, (message)=>{
                clearTimeout(timeout);
                this.subscriber.unsubscribe(id).catch(err => console.error('Unsubscribe error:', err));
                resolve(JSON.parse(message))
            }).then(() => {
                return this.publisher.lPush(queueName, JSON.stringify({id, message}))
            }).catch(err => {
                clearTimeout(timeout);
                console.error(`HTTP Server: Error in pub/sub:`, err);
                reject(err);
            });
        })
    }

    public async getLatestPrice(): Promise<string | null> {
        try {
            const result = await this.publisher.lRange('priceToFE', -1, -1);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching latest price from Redis:', error);
            return null;
        }
    }
}