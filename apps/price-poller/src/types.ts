export type binanceData = {
  "e": string  // Event type
  "E": number   // Event time
  "s": string // Symbol
  "a": number	// Aggregate trade ID
  "p": string     // Price
  "q": string       // Quantity
  "f": number         // First trade ID
  "l": number         // Last trade ID
  "T": number   // Trade time
  "m": boolean     // Is the buyer the market maker?
}

export interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  trade_time: Date;
}