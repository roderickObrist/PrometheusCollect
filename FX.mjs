import MarginOrderBook from "./Margin.mjs";
import OrderBook from "./OrderBook.mjs";
import WebSocket from "ws";

export default class FXOrderBook extends MarginOrderBook {
  connect() {
    const socket = new WebSocket("wss://ws-feed.pro.coinbase.com");

    return OrderBook.prototype.connect.call(this, socket);
  }

  onSocketOpen() {
    this.socket.send(JSON.stringify({
      "type": "subscribe",
      "product_ids": ["BTC-USD", "ETH-BTC", "LTC-BTC", "XRP-BTC"],
      "channels": ["ticker"]
    }));
  }

  get watchdogTimeout() {
    return 120e3;
  }

  async loop() {
    const pairs = ["EUR", "GBP", "JPY"].map(c => `${c}/USD`)
        .join(","),
      key = "?api_key=8lb6Es1DZfBNT22wwNVx4aLtCsIXu5Ue";

    const status = await this.safeFetch(`https://api.1forge.com/market_status${key}`);

    let values = [-1, -1, -1];

    if (status.market_is_open) {
      const freshQuote = await this.safeFetch(`https://api.1forge.com/quotes${key}&pairs=${pairs}&referer=1forge.com`);

      values = freshQuote.map(d => d.p);
    }

    for (const pair of ["btcusd", "ethbtc", "ltcbtc", "xrpbtc"]) {
      try {
        const {last} = await this.safeFetch(`https://www.bitstamp.net/api/v2/ticker/${pair}/`);

        values.push(Number(last));
      } catch (e) {
        values.push(-1);
      }
    }

    this.socket.emit("message", JSON.stringify({
      "type": "http",
      values
    }));
  }
}
