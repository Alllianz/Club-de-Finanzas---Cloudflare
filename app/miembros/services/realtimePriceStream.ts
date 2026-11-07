// Servicio Modular de Precios en Tiempo Real (WebSocket Ultra-Baja Latencia)
// Arquitectura Aegis - Zero Look-Ahead Bias

export interface RealtimePriceTick {
  symbol: string;         // Ej: "BTC-USD"
  price: number;          // Precio spot actual
  change24hPct: number;   // Variación 24h %
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

  // Mapeo entre símbolos del club y streams de Binance
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
  };

  private streamToSymbolMap: Record<string, string> = {
    "BTCUSDT": "BTC-USD",
    "ETHUSDT": "ETH-USD",
    "SOLUSDT": "SOL-USD",
    "BNBUSDT": "BNB-USD",
  };

  constructor() {
    // Inicializar streams por defecto
    Object.values(this.symbolToStreamMap).forEach((st) => this.subscribedStreams.add(st));
    this.startBroadcastInterval();
  }

  /**
   * Ciclo de despacho cada 10 segundos: envía a todos los escuchas el precio más reciente actualizado
   */
  private startBroadcastInterval() {
    if (typeof window === "undefined") return;
    if (this.broadcastIntervalTimer) return;

    this.broadcastIntervalTimer = setInterval(() => {
      this.dispatchLatestTicks();
    }, 10000); // 10 segundos exactos requeridos por Allianz
  }

  private dispatchLatestTicks() {
    this.listeners.forEach((_, symbol) => {
      const latest = this.latestTicks.get(symbol);
      if (latest) {
        this.notifyListeners(symbol, latest);
      }
    });
  }

  /**
   * Conecta o asegura la conexión activa del WebSocket
   */
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
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const data = payload.data || payload;
          if (data && data.e === "24hrTicker" && data.s) {
            const rawPair = data.s.toUpperCase();
            const normalizedSymbol = this.streamToSymbolMap[rawPair] || rawPair;
            const price = parseFloat(data.c);
            const changePct = parseFloat(data.P);
            const high = parseFloat(data.h);
            const low = parseFloat(data.l);

            if (!isNaN(price)) {
              const tick: RealtimePriceTick = {
                symbol: normalizedSymbol,
                price,
                change24hPct: isNaN(changePct) ? 0 : changePct,
                high24h: isNaN(high) ? undefined : high,
                low24h: isNaN(low) ? undefined : low,
                timestampMs: Date.now(),
              };

              // Se guarda siempre la cotización más reciente recibida de Binance
              this.latestTicks.set(normalizedSymbol, tick);
              if (normalizedSymbol !== rawPair) {
                this.latestTicks.set(rawPair, tick);
              }
              // El despacho a los escuchas se realiza cada 10 segundos vía broadcastIntervalTimer
            }
          }
        } catch {
          // Ignorar frames malformados
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

  /**
   * Notifica a todos los escuchas suscritos a un símbolo
   */
  private notifyListeners(symbol: string, tick: RealtimePriceTick) {
    const list = this.listeners.get(symbol.toUpperCase());
    if (list) {
      list.forEach((cb) => {
        try {
          cb(tick);
        } catch {
          // Ignorar fallos en listeners individuales
        }
      });
    }
  }

  /**
   * Suscribe un callback a las actualizaciones segundo a segundo de un símbolo
   */
  public subscribe(symbol: string, callback: PriceListener): () => void {
    const norm = symbol.trim().toUpperCase();
    if (!this.listeners.has(norm)) {
      this.listeners.set(norm, new Set());
    }
    this.listeners.get(norm)!.add(callback);

    // Enviar inmediatamente la última cotización en memoria si existe
    const cached = this.latestTicks.get(norm) || this.latestTicks.get(norm.replace("-USD", "USDT"));
    if (cached) {
      callback(cached);
    }

    // Asegurar que el stream esté conectado
    this.connect();

    // Dinámicamente agregar stream si es crypto no contemplado
    const streamName = this.symbolToStreamMap[norm] || `${norm.toLowerCase().replace("-", "").replace("usd", "usdt")}@ticker`;
    if (!this.subscribedStreams.has(streamName) && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.subscribedStreams.add(streamName);
      try {
        this.socket.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: [streamName],
            id: Date.now(),
          })
        );
      } catch {
        // Ignorar
      }
    }

    // Función para cancelar la suscripción
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

  /**
   * Obtiene la última cotización instantánea en memoria
   */
  public getLatest(symbol: string): RealtimePriceTick | undefined {
    const norm = symbol.trim().toUpperCase();
    return this.latestTicks.get(norm) || this.latestTicks.get(norm.replace("-USD", "USDT"));
  }
}

// Instancia única (Singleton) compartida en toda la aplicación
export const realtimePriceStream = new RealtimePriceStreamService();
