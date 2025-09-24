import {createClient, RedisClientType} from "redis";
export class RedisManager{
    private static instance: RedisManager;
    private client: RedisClientType;
    constructor(){
        this.client = createClient();
    }
    public getInstance(){
        if(!RedisManager.instance){
            RedisManager.instance = new RedisManager()
        }return RedisManager.instance
    }
    private addOrder(){
        const interval = setInterval( async() => {
            const message = await this.client.rPop('Order')

        },1000)
    }
    private addUser(){

    }
}