import OrderBook from "./OrderBook.mjs";
import WebSocket from "ws";

export default class BinanceOrderBook extends OrderBook {
  connect() {
    const socket = new WebSocket("wss://api.bitfinex.com/ws/2");

    return super.connect(socket);
  }

  onSocketOpen() {
    this.sequenceId = 0;

    this.socket.send(JSON.stringify({
      "event": "conf",
      "flags": 65536 + 131072
    }));

    this.socket.send(JSON.stringify({
      "event": "subscribe",
      "channel": "book",
      "prec": "r0",
      "symbol": "tBTCUSD",
      "len": 100
    }));

    this.socket.send(JSON.stringify({
      "event": "subscribe",
      "channel": "trades",
      "symbol": "tBTCUSD"
    }));
  }

  onSocketMessage(data, socket) {
    if (!(Array.isArray(data))) {
      return super.onSocketMessage(data, socket);
    }

    const sequence = data[data.length - 1];

    if (
      this.sequenceId &&
        this.sequenceId + 1 !== sequence
    ) {
      return false;
    }

    this.sequenceId = sequence;
    return super.onSocketMessage(data, socket);
  }

  getServerTimestamp(data) {
    if (data[1] === "te") {
      return data[2][1];
    }

    return undefined;
  }
}
