import OrderBook from "./OrderBook.mjs";
import {CoinbasePro} from "coinbase-pro-node";
import WebSocket from "ws";

export default class GDAXOrderBook extends OrderBook {
  connect() {
    const socket = new WebSocket("wss://ws-feed.pro.coinbase.com");

    return super.connect(socket);
  }

  onSocketOpen() {
    this.socket.send(JSON.stringify({
      "type": "subscribe",
      "product_ids": [this.pair.join("-")],
      "channels": ["full"]
    }));

    this.needsSnapshot = true;
    this.sequenceId = 0;
  }

  onSocketMessage(data, socket) {
    if (this.sequenceId) {
      return (data.sequence === this.sequenceId + 1) &&
        super.onSocketMessage(data, socket);
    }

    // This is the first message
    if (this.needsSnapshot) {
      this.needsSnapshot = false;
      this.fetchSnapshot();
    }

    return super.onSocketMessage(data, socket);
  }

  getServerTimestamp(data) {
    return data.time
      ? new Date(data.time)
        .getTime()
      : undefined;
  }

  async fetchSnapshot(attempt = 0) {
    const api = new CoinbasePro();

    let data = null;

    try {
      data = await api.rest.product.getProductOrderBook(this.pair.join("-"), {
        "level": 3
      });

    } catch (e) {
      if (attempt > 2) {
        throw e;
      }

      await new Promise(r => setTimeout(r, 5e3));
      this.fetchSnapshot(attempt + 1);
      return;
    }

    this.log(data, this.socket.id);
  }
}
