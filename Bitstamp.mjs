import OrderBook from "./OrderBook.mjs";
import WebSocket from "ws";
import fetch from "node-fetch";

export default class BitstampOrderBook extends OrderBook {
  connect() {
    const socket = new WebSocket("wss://ws.bitstamp.net");

    return super.connect(socket);
  }

  onSocketOpen() {
    const symbol = this.pair.join("")
        .toLowerCase(),
      channels = [`live_orders_${symbol}`, `live_trades_${symbol}`];

    for (const channel of channels) {
      this.socket.send(JSON.stringify({
        "event": "bts:subscribe",
        "data": {channel}
      }));
    }
  }

  onSocketMessage(data, socket) {
    if (!this.socket.snapshot) {
      this.socket.snapshot = true;
      this.fetchSnapshot();
    }

    return super.onSocketMessage(data, socket);
  }

  getServerTimestamp({data}) {
    if (
      data &&
        !data.bids &&
        data.microtimestamp
    ) {
      return Number(data.microtimestamp.slice(0, -3));
    }

    return undefined;
  }

  async fetchSnapshot(attempt = 0) {
    const symbol = this.pair.join("")
      .toLowerCase();

    let data = null;

    try {
      data = await fetch(`https://www.bitstamp.net/api/v2/order_book/${symbol}/?group=2`);
    } catch (e) {
      if (attempt > 2) {
        throw e;
      }

      await new Promise(r => setTimeout(r, 5e3));
      this.fetchSnapshot(attempt + 1);
      return;
    }

    this.log({
      "event": "snapshot",
      "data": await data.json()
    });
  }
}
