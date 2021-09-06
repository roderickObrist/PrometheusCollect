import OrderBook from "./OrderBook.mjs";
import WebSocket from "ws";

export default class GeminiOrderBook extends OrderBook {
  connect() {
    const socket = new WebSocket(`wss://api.gemini.com/v1/marketdata/${this.pair.join("")}`);

    return super.connect(socket);
  }

  onSocketOpen() {
    this.sequenceId = 0;
  }

  onSocketMessage(data, socket) {
    if (
      this.sequenceId &&
        this.sequenceId + 1 !== data.socket_sequence
    ) {
      return false;
    }

    this.sequenceId = data.socket_sequence;

    return super.onSocketMessage(data, socket);
  }

  getServerTimestamp(data) {
    return data.timestampms;
  }
}
