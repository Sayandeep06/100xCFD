export type binanceData = {
  "e": string  
  "E": number   
  "s": string 
  "a": number	
  "p": string     
  "q": string       
  "f": number         
  "l": number         
  "T": number   
  "m": boolean     
}

export interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  trade_time: Date;
}