import { createClient, RedisClientType } from 'redis';

export class RedisManager{
    private static instance: RedisManager;
    private publisher: RedisClientType;
    private subscriber: RedisClientType;
    constructor(){
        this.publisher = createClient()
        this.publisher.connect();
        this.subscriber = createClient()
        this.subscriber.connect();
    }
    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager();
        }return this.instance
    }
    public publishAndSubscribe(message: string){
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const parsedMessage = JSON.parse(message);
        const queueName = parsedMessage.action === 'create_user' ? 'User' : 'Order';

        return new Promise<any>((resolve)=>{
            this.subscriber.subscribe(id, (message)=>{
                this.subscriber.unsubscribe(id)
                resolve(JSON.parse(message))
            })
            this.publisher.lPush(queueName, JSON.stringify({id, message}))
        })
    }

    public async getLatestPrice(): Promise<string | null> {
        try {
            // Get the latest price from the 'priceToFE' queue
            const result = await this.publisher.lRange('priceToFE', -1, -1);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching latest price from Redis:', error);
            return null;
        }
    }
}