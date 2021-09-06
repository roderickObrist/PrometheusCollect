import OrderBook from "./OrderBook.mjs";
import {Client} from "rpc-websockets";

export default class BitFlyerOrderBook extends OrderBook {
  connect() {
    this.apiSocket = new Client("wss://ws.lightstream.bitflyer.com/json-rpc", {
      "reconnect": false
    });

    return super.connect(this.apiSocket.socket);
  }

  onSocketOpen() {
    this.apiSocket.call("subscribe", {
      "channel": "lightning_board_snapshot_BTC_JPY"
    });

    this.apiSocket.call("subscribe", {
      "channel": "lightning_board_BTC_JPY"
    });

    this.apiSocket.call("subscribe", {
      "channel": "lightning_executions_BTC_JPY"
    });
  }

  onSocketMessage(data, socket) {
    if (!data.params) {
      return super.onSocketMessage(data, socket);
    }

    const {channel} = data.params;

    if (this.apiSocket) {
      this.apiSocket[channel] = true;

      if (
        this.apiSocket.lightning_board_BTC_JPY &&
          channel === "lightning_board_snapshot_BTC_JPY"
      ) {
        this.apiSocket.call("unsubscribe", {
          channel
        });
      }
    }

    return super.onSocketMessage(data, socket);
  }

  getServerTimestamp(data) {
    if (
      data.params &&
        data.params.channel === "lightning_executions_BTC_JPY"
    ) {
      const trade = data.params.message[data.params.message.length - 1];

      return new Date(trade.exec_date)
        .getTime();
    }

    return undefined;
  }
}
