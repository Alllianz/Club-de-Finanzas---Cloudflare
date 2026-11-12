export interface RealtimePriceTick {
  symbol: string;
  price: number;
  change24hPct: number;
  high24h?: number;
  low24h?: number;
  timestampMs: number;
}

type PriceListener = (tick: RealtimePriceTick) => void;

class RealtimePriceStreamService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<PriceListener>> = new Map();
  private subscribedStreams: Set<string> = new Set();
  private reconnectTimer: any = null;
  private broadcastIntervalTimer: any = null;
  private isConnecting: boolean = false;
  private latestTicks: Map<string, RealtimePriceTick> = new Map();

  private symbolToStreamMap: Record<string, string> = {
    "BTC-USD": "btcusdt@ticker",
    "BTC": "btcusdt@ticker",
    "BTCUSDT": "btcusdt@ticker",
    "ETH-USD": "ethusdt@ticker",
    "ETH": "ethusdt@ticker",
    "ETHUSDT": "ethusdt@ticker",
    "SOL-USD": "solusdt@ticker",
    "SOL": "solusdt@ticker",
    "SOLUSDT": "solusdt@ticker",
    "BNB-USD": "bnbusdt@ticker",
    "BNB": "bnbusdt@ticker",
    "BNBUSDT": "bnbusdt@ticker",
    "USDTARS": "usdtars@ticker",
    "USDT-ARS": "usdtars@ticker",
    "PAXGUSDT": "paxgusdt@ticker",
    "PAXG-USDT": "paxgusdt@ticker",
    "PAXG": "paxgusdt@ticker",
  };

  private streamToSymbolMap: Record<string, string> = {
    "BTCUSDT": "BTCUSDT",
    "ETHUSDT": "ETHUSDT",
    "SOLUSDT": "SOLUSDT",
    "BNBUSDT": "BNBUSDT",
    "USDTARS": "USDTARS",
    "PAXGUSDT": "PAXGUSDT",
  };

  constructor() {
    Object.values(this.symbolToStreamMap).forEach((st) => this.subscribedStreams.add(st));
    this.startBroadcastInterval();
  }

  private startBroadcastInterval() {
    if (typeof window === "undefined") return;
    if (this.broadcastIntervalTimer) return;

    this.broadcastIntervalTimer = setInterval(() => {
      this.dispatchLatestTicks();
    }, 10000);
  }

  private dispatchLatestTicks() {
    this.listeners.forEach((_, symbol) => {
      const latest = this.getLatest(symbol);
      if (latest) {
        this.notifyListeners(symbol, latest);
      }
    });
  }

  public getStreamName(symbol: string): string {
    const s = (symbol || "").trim().toLowerCase();
    if (s.endsWith("@ticker")) return s;
    const norm = s.toUpperCase();
    if (this.symbolToStreamMap[norm]) {
      return this.symbolToStreamMap[norm];
    }
    let clean = s.replace(/[\/\-_]/g, "");
    if (clean.endsWith("usd") && !clean.endsWith("usdt")) {
      clean = clean.slice(0, -3) + "usdt";
    }
    return `${clean}@ticker`;
  }

  public connect() {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    try {
      const defaultStreams = Array.from(this.subscribedStreams).join("/");
      const url = `wss://stream.binance.com:9443/stream?streams=${defaultStreams}`;
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnecting = false;
        if (this.subscribedStreams.size > 0) {
          try {
            this.socket?.send(
              JSON.stringify({
                method: "SUBSCRIBE",
                params: Array.from(this.subscribedStreams),
                id: Date.now(),
              })
            );
          } catch {
          }
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const data = payload.data || payload;
          if (data && data.e === "24hrTicker" && data.s) {
            const rawPair = data.s.toUpperCase();
            const price = parseFloat(data.c);
            const changePct = parseFloat(data.P);
            const high = parseFloat(data.h);
            const low = parseFloat(data.l);

            if (!isNaN(price)) {
              const tick: RealtimePriceTick = {
                symbol: rawPair,
                price,
                change24hPct: isNaN(changePct) ? 0 : changePct,
                high24h: isNaN(high) ? undefined : high,
                low24h: isNaN(low) ? undefined : low,
                timestampMs: Date.now(),
              };

              this.latestTicks.set(rawPair, tick);
              const normalized = this.streamToSymbolMap[rawPair];
              if (normalized && normalized !== rawPair) {
                this.latestTicks.set(normalized, { ...tick, symbol: normalized });
              }
              if (rawPair === "BTCUSDT") {
                this.latestTicks.set("BTC-USD", { ...tick, symbol: "BTC-USD" });
                this.latestTicks.set("BTC", { ...tick, symbol: "BTC" });
              } else if (rawPair === "ETHUSDT") {
                this.latestTicks.set("ETH-USD", { ...tick, symbol: "ETH-USD" });
                this.latestTicks.set("ETH", { ...tick, symbol: "ETH" });
              } else if (rawPair === "SOLUSDT") {
                this.latestTicks.set("SOL-USD", { ...tick, symbol: "SOL-USD" });
                this.latestTicks.set("SOL", { ...tick, symbol: "SOL" });
              } else if (rawPair === "BNBUSDT") {
                this.latestTicks.set("BNB-USD", { ...tick, symbol: "BNB-USD" });
                this.latestTicks.set("BNB", { ...tick, symbol: "BNB" });
              } else if (rawPair === "USDTARS") {
                this.latestTicks.set("USDT-ARS", { ...tick, symbol: "USDT-ARS" });
              } else if (rawPair === "PAXGUSDT") {
                this.latestTicks.set("PAXG-USDT", { ...tick, symbol: "PAXG-USDT" });
                this.latestTicks.set("PAXG", { ...tick, symbol: "PAXG" });
              }
            }
          }
        } catch {
        }
      };

      this.socket.onerror = () => {
        this.scheduleReconnect();
      };

      this.socket.onclose = () => {
        this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private notifyListeners(symbol: string, tick: RealtimePriceTick) {
    const list = this.listeners.get(symbol.toUpperCase());
    if (list) {
      list.forEach((cb) => {
        try {
          cb(tick);
        } catch {
        }
      });
    }
  }

  public subscribe(symbol: string, callback: PriceListener): () => void {
    const norm = symbol.trim().toUpperCase();
    if (!this.listeners.has(norm)) {
      this.listeners.set(norm, new Set());
    }
    this.listeners.get(norm)!.add(callback);

    const cached = this.getLatest(norm);
    if (cached) {
      callback(cached);
    }

    this.connect();

    const streamName = this.getStreamName(norm);
    if (!this.subscribedStreams.has(streamName)) {
      this.subscribedStreams.add(streamName);
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(
            JSON.stringify({
              method: "SUBSCRIBE",
              params: [streamName],
              id: Date.now(),
            })
          );
        } catch {
        }
      }
    }

    return () => {
      const set = this.listeners.get(norm);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(norm);
        }
      }
    };
  }

  public getLatest(symbol: string): RealtimePriceTick | undefined {
    const norm = (symbol || "").trim().toUpperCase();
    if (this.latestTicks.has(norm)) {
      return this.latestTicks.get(norm);
    }
    const clean = norm.replace(/[\/\-_]/g, "");
    if (this.latestTicks.has(clean)) {
      return this.latestTicks.get(clean);
    }
    if (norm.endsWith("-USD")) {
      const usdt = norm.replace("-USD", "USDT");
      if (this.latestTicks.has(usdt)) return this.latestTicks.get(usdt);
    }
    if (norm.endsWith("USDT")) {
      const usd = norm.slice(0, -4) + "-USD";
      if (this.latestTicks.has(usd)) return this.latestTicks.get(usd);
    }
    return undefined;
  }
}

export const realtimePriceStream = new RealtimePriceStreamService();
