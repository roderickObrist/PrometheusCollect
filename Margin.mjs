import OrderBook from "./OrderBook.mjs";
import {EventEmitter} from "events";
import fetch from "node-fetch";

export default class MarginOrderBook extends OrderBook {
  constructor(...args) {
    super(...args);

    const loop = () => {
      setTimeout(loop, 60e3);
      this.loop();
    };

    setTimeout(loop, 10e3);
  }

  connect() {
    return super.connect(new EventEmitter());
  }

  get watchdogTimeout() {
    return 120e3;
  }

  async loop() {
    await this.safeFetch(
      "https://api.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:short/last",
      msg => ["short", msg[1]]
    );
    await this.safeFetch(
      "https://api.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:long/last",
      msg => ["long", msg[1]]
    );
    await this.safeFetch(
      "https://www.bitmex.com/api/v1/trade?symbol=.XBTUSDPI&count=1&columns=price&reverse=true",
      msg => ["bitmex", msg[0].price]
    );
  }

  async safeFetch(url, map) {
    try {
      const req = await fetch(url),
        msg = await req.json();

      // This stops the socket timeout
      if (!map) {
        return msg;
      }

      this.socket.emit("message", JSON.stringify(map(msg)));

    } catch (e) {
      console.error(e);
    }

    return null;
  }
}
