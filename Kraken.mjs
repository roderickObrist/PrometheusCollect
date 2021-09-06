import OrderBook from "./OrderBook.mjs";
import WebSocket from "ws";

export default class KrakenOrderBook extends OrderBook {
  connect() {
    const socket = new WebSocket("wss://ws.kraken.com");

    return super.connect(socket);
  }

  onSocketOpen() {
    const conf = {
      "event": "subscribe",
      "pair": [
        `XBT/${this.pair.currency}`
      ]
    };

    this.socket.send(JSON.stringify({
      "subscription": {
        "name": "book",
        "depth": 1000
      },
      ...conf
    }));

    this.socket.send(JSON.stringify({
      "subscription": {
        "name": "trade"
      },
      ...conf
    }));
  }
}
