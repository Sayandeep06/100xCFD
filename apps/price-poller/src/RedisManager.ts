import {createClient} from 'redis'
import { RedisClientType } from 'redis'
import { TradeData } from './types';

export class RedisManager{
    private static instance: RedisManager
    private redisClient: RedisClientType
    private pusher: RedisClientType
    constructor(){
        this.redisClient = createClient()
        this.redisClient.connect()
        this.pusher = createClient()
        this.pusher.connect()
    }
    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager();
        }return this.instance
    }
    public sendToDB(message:TradeData){
        this.redisClient.lPush('toDB', JSON.stringify(message))
    }
    public sendPrice(price: string){
        this.pusher.lPush('priceToFE', price)
        this.pusher.lPush('priceToEngine', price)
    }
}