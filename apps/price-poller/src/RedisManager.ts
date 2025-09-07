import {createClient} from 'redis'
import { RedisClientType } from 'redis'
import { TradeData } from './types';

export class RedisManager{
    private static instance: RedisManager
    private redisClient: RedisClientType
    constructor(){
        this.redisClient = createClient()
        this.redisClient.connect()
    }
    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager();
        }return this.instance
    }
    public send(message:TradeData){
        this.redisClient.lPush('prices', JSON.stringify(message))
    }
}

