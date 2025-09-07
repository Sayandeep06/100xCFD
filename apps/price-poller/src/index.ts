import ws, { WebSocketServer } from 'ws'
import WebSocket from 'ws'
import {RedisManager} from './RedisManager'
import { binanceData, TradeData } from './types';

const wsUrl = 'wss://fstream.binance.com/ws/btcusdt@aggTrade';

export class Poller{
    private static instance: Poller
    private ws: WebSocket | null = null
    private constructor(){
        
    }
    public static getInstance(){
        if(!this.instance){
            this.instance = new Poller();
        }return this.instance
    }
    public start(){
        if(this.ws){
            console.log("Connection exists")
        }
        this.ws = new WebSocket(wsUrl)
        this.connect()
    }
    private connect(){
        if(!this.ws)    return 

        this.ws.on('open', () => {
            console.log("Connection established")
        })

        this.ws.on('message',(message)=>{
            try{
                const data: binanceData = JSON.parse(message.toString())
                const tradeData: TradeData  = {
                    symbol: data.s,
                    price: parseFloat(data.p),
                    quantity: parseFloat(data.q),
                    trade_time: new Date(data.T),
                }
                RedisManager.getInstance().send(tradeData)
            }catch(error){
                console.log(error)
            }
        })

        this.ws.on('error', (error)=>{
            console.log(error)
        })
    }
    public close = () => {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

}

const poller = Poller.getInstance();
poller.start();