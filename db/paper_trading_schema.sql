-- Esquema de Cloudflare D1 para Paper Trading Oficial (Club de Finanzas UBA)
-- Adaptado directamente del motor institucional de Aegis

CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    initial_capital REAL NOT NULL,
    max_leverage INTEGER NOT NULL,
    allow_short INTEGER NOT NULL,
    fee_crypto_bps INTEGER NOT NULL,
    fee_stock_bps INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS game_participants (
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (game_id, user_id)
);

CREATE TABLE IF NOT EXISTS paper_portfolios (
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    cash_balance REAL NOT NULL,
    realized_pnl REAL NOT NULL,
    total_fees REAL NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (game_id, user_id)
);

CREATE TABLE IF NOT EXISTS paper_positions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    current_price REAL NOT NULL,
    leverage INTEGER NOT NULL,
    margin_mode TEXT NOT NULL,
    initial_margin REAL NOT NULL,
    unrealized_pnl REAL NOT NULL,
    liquidation_price REAL NOT NULL,
    take_profit REAL DEFAULT NULL,
    stop_loss REAL DEFAULT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_trades (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    order_side TEXT NOT NULL,
    position_side TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fee REAL NOT NULL,
    realized_pnl REAL NOT NULL,
    leverage INTEGER NOT NULL,
    margin_mode TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_orders (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    order_side TEXT NOT NULL,
    position_side TEXT NOT NULL,
    order_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    filled_quantity REAL DEFAULT 0,
    limit_price REAL,
    take_profit REAL DEFAULT NULL,
    stop_loss REAL DEFAULT NULL,
    leverage REAL NOT NULL DEFAULT 1,
    margin_mode TEXT DEFAULT 'ISOLATED',
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    filled_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_paper_positions_lookup 
    ON paper_positions(game_id, user_id);

CREATE INDEX IF NOT EXISTS idx_paper_trades_lookup 
    ON paper_trades(game_id, user_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_paper_orders_lookup 
    ON paper_orders(game_id, user_id, status);

-- Inicializar Torneo Institucional Club de Finanzas UBA 2026
INSERT OR IGNORE INTO games (
    id, title, description, creator_id, creator_name,
    initial_capital, max_leverage, allow_short,
    fee_crypto_bps, fee_stock_bps, status, created_at
) VALUES (
    'torneo-club-2026',
    'Competencia Oficial de Portafolios - Club de Finanzas UBA',
    'Torneo de Paper Trading en tiempo real para los 6 grupos de trabajo con cotizaciones en vivo y apalancamiento regulado.',
    'allianz_director',
    'Comité Académico Club de Finanzas UBA',
    10000.0,
    10,
    1,
    5,
    2,
    'ACTIVE',
    1793500000000
);

-- Sembrar los 6 grupos oficiales en la competencia y sus portafolios iniciales
INSERT OR IGNORE INTO game_participants (game_id, user_id, user_name, joined_at)
VALUES 
    ('torneo-club-2026', 'grupo_1', 'Grupo 1', 1793500000000),
    ('torneo-club-2026', 'grupo_2', 'Grupo 2', 1793500000000),
    ('torneo-club-2026', 'grupo_3', 'Grupo 3', 1793500000000),
    ('torneo-club-2026', 'grupo_4', 'Grupo 4', 1793500000000),
    ('torneo-club-2026', 'grupo_5', 'Grupo 5', 1793500000000),
    ('torneo-club-2026', 'grupo_6', 'Grupo 6', 1793500000000);

INSERT OR IGNORE INTO paper_portfolios (game_id, user_id, cash_balance, realized_pnl, total_fees, updated_at)
VALUES
    ('torneo-club-2026', 'grupo_1', 10000.0, 0.0, 0.0, 1793500000000),
    ('torneo-club-2026', 'grupo_2', 10000.0, 0.0, 0.0, 1793500000000),
    ('torneo-club-2026', 'grupo_3', 10000.0, 0.0, 0.0, 1793500000000),
    ('torneo-club-2026', 'grupo_4', 10000.0, 0.0, 0.0, 1793500000000),
    ('torneo-club-2026', 'grupo_5', 10000.0, 0.0, 0.0, 1793500000000),
    ('torneo-club-2026', 'grupo_6', 10000.0, 0.0, 0.0, 1793500000000);
