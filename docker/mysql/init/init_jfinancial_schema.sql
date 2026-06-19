-- 初始化 JFinancial 資料庫結構與測試資料
SET NAMES utf8mb4;
SET time_zone = '+08:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payment_order;
DROP TABLE IF EXISTS member_subscription;
DROP TABLE IF EXISTS subscription_plan;
DROP TABLE IF EXISTS member_watchlist;
DROP TABLE IF EXISTS portfolio_holding;
DROP TABLE IF EXISTS member_role;
DROP TABLE IF EXISTS market_index;
DROP TABLE IF EXISTS member;
DROP TABLE IF EXISTS market_price_history;
DROP TABLE IF EXISTS role;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE role (
	id INT NOT NULL AUTO_INCREMENT,
	role_name VARCHAR(30) NOT NULL COMMENT '權限身分',
	PRIMARY KEY (id),
	UNIQUE KEY uk_role_role_name (role_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE member (
	id INT NOT NULL AUTO_INCREMENT,
	email VARCHAR(100) NOT NULL COMMENT '使用者的登入帳號',
	password_hash VARCHAR(100) NULL COMMENT '加密密碼存放區（OAuth 用戶為 NULL）',
	display_name VARCHAR(50) NOT NULL COMMENT '暱稱',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '創建帳號時間',
	oauth_provider VARCHAR(20) NULL COMMENT '第三方登入來源，例如 google、github；本地帳號為 NULL',
	oauth_id VARCHAR(100) NULL COMMENT '第三方登入的 Provider 唯一使用者 ID',
	PRIMARY KEY (id),
	UNIQUE KEY uk_member_email (email),
	UNIQUE KEY uk_member_oauth (oauth_provider, oauth_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE market_index (
	id INT NOT NULL AUTO_INCREMENT,
	symbol VARCHAR(20) NOT NULL COMMENT '指數代號',
	name VARCHAR(50) NOT NULL COMMENT '指數名稱',
	current_price DECIMAL(10,2) NOT NULL COMMENT '指數價格',
	change_point DECIMAL(10,2) NOT NULL COMMENT '指數漲跌點數',
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
	PRIMARY KEY (id),
	UNIQUE KEY uk_market_index_symbol (symbol)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE member_role (
	member_id INT NOT NULL,
	role_id INT NOT NULL,
	PRIMARY KEY (member_id, role_id),
	KEY fk_member_role_role (role_id),
	CONSTRAINT fk_member_role_member
		FOREIGN KEY (member_id) REFERENCES member (id)
		ON DELETE CASCADE
		ON UPDATE RESTRICT,
	CONSTRAINT fk_member_role_role
		FOREIGN KEY (role_id) REFERENCES role (id)
		ON DELETE RESTRICT
		ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE member_watchlist (
	member_id INT NOT NULL,
	market_index_id INT NOT NULL,
	added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入時間',
	PRIMARY KEY (member_id, market_index_id),
	KEY fk_member_watchlist_market_index (market_index_id),
	CONSTRAINT fk_member_watchlist_market_index
		FOREIGN KEY (market_index_id) REFERENCES market_index (id)
		ON DELETE CASCADE
		ON UPDATE RESTRICT,
	CONSTRAINT fk_member_watchlist_member
		FOREIGN KEY (member_id) REFERENCES member (id)
		ON DELETE CASCADE
		ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE market_price_history (
	id BIGINT NOT NULL AUTO_INCREMENT,
	symbol VARCHAR(20) NOT NULL COMMENT '指數代號',
	price DECIMAL(15,4) NOT NULL COMMENT '快照價格',
	recorded_at DATETIME NOT NULL COMMENT '記錄時間',
	PRIMARY KEY (id),
	INDEX idx_market_price_history_symbol_recorded_at (symbol, recorded_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE portfolio_holding (
	id INT NOT NULL AUTO_INCREMENT,
	member_id INT NOT NULL COMMENT '會員 ID',
	symbol VARCHAR(20) NOT NULL COMMENT '指數代號',
	quantity DECIMAL(15,4) NOT NULL COMMENT '持股數量',
	buy_price DECIMAL(15,4) NOT NULL COMMENT '買入均價',
	buy_date DATE NOT NULL COMMENT '買入日期',
	note VARCHAR(200) COMMENT '備註',
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
	PRIMARY KEY (id),
	INDEX idx_portfolio_holding_member_id (member_id),
	CONSTRAINT fk_portfolio_holding_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------
-- 種子資料
-- ---------------------------------------------------------------

INSERT INTO role (id, role_name)
VALUES
	(1, 'ROLE_USER'),
	(2, 'ROLE_ADMIN'),
	(3, 'ROLE_PREMIUM');

INSERT INTO member (id, email, password_hash, display_name, created_at)
VALUES
	(1, 'test@example.com', '$2b$10$PbSOaSRqtzwMPGdKtHNUS.xjuTIAh/46O34/yLbTKPMdRZDHFpmyi', '測試會員', '2026-03-30 15:21:38');

INSERT INTO member_role (member_id, role_id)
VALUES
	(1, 1);

-- market_index：symbol 與後端排程任務保持一致
-- 股市：TWII(Fugle) / SPX、IXIC、DJI、N225、EUR(FRED)
-- 債券：US10Y、JP10Y(FRED)
-- 匯率：USDTWD、JPYTWD、CNYTWD(Frankfurter)
-- 注意：current_price / change_point 為佔位初始值，MarketDataSeeder 啟動後會以真實資料覆蓋
INSERT INTO market_index (id, symbol, name, current_price, change_point, updated_at)
VALUES
	(1,  'TWII',   '台灣加權指數',           39521.00,   150.00, '2026-04-29 00:00:00'),
	(2,  'SPX',    'S&P 500',                7138.00,     25.00, '2026-04-29 00:00:00'),
	(3,  'IXIC',   'NASDAQ Composite',      24663.00,   -45.00, '2026-04-29 00:00:00'),
	(4,  'DJI',    'Dow Jones',             49141.00,    120.00, '2026-04-29 00:00:00'),
	(5,  'N225',   'Nikkei 225',            59917.00,    200.00, '2026-04-29 00:00:00'),
	(6,  'EUR',    'Euro Stoxx 50',          5836.00,     30.00, '2026-04-29 00:00:00'),
	(7,  'US10Y',  'US 10-Year',                4.35,    -0.05, '2026-04-29 00:00:00'),
	(8,  'JP10Y',  'JP 10-Year',                2.47,     0.02, '2026-04-29 00:00:00'),
	(9,  'USDTWD', 'USD/TWD',                  31.53,     0.10, '2026-04-29 00:00:00'),
	(10, 'JPYTWD', 'JPY/TWD',                   0.20,     0.00, '2026-04-29 00:00:00'),
	(11, 'CNYTWD', 'CNY/TWD',                   4.61,     0.02, '2026-04-29 00:00:00');

-- 測試帳號追蹤台灣加權指數與 S&P 500
INSERT INTO member_watchlist (member_id, market_index_id, added_at)
VALUES
	(1, 1, '2026-04-29 00:00:00'),
	(1, 2, '2026-04-29 00:00:00');

-- ---------------------------------------------------------------
-- 訂閱方案
-- ---------------------------------------------------------------

CREATE TABLE subscription_plan (
	id INT NOT NULL AUTO_INCREMENT,
	code VARCHAR(20) NOT NULL COMMENT '方案代碼 MONTHLY / ANNUAL',
	name VARCHAR(50) NOT NULL COMMENT '方案名稱',
	price_twd INT NOT NULL COMMENT '方案售價（新台幣整數）',
	duration_days INT NOT NULL COMMENT '訂閱天數',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
	PRIMARY KEY (id),
	UNIQUE KEY uk_subscription_plan_code (code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE member_subscription (
	id INT NOT NULL AUTO_INCREMENT,
	member_id INT NOT NULL COMMENT '會員 ID',
	plan_id INT NOT NULL COMMENT '方案 ID',
	status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE' COMMENT '訂閱狀態',
	start_at DATETIME NOT NULL COMMENT '訂閱開始時間',
	expire_at DATETIME NOT NULL COMMENT '訂閱到期時間',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
	PRIMARY KEY (id),
	INDEX idx_member_subscription_member_id (member_id),
	CONSTRAINT fk_member_subscription_member
		FOREIGN KEY (member_id) REFERENCES member (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_member_subscription_plan
		FOREIGN KEY (plan_id) REFERENCES subscription_plan (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payment_order (
	id INT NOT NULL AUTO_INCREMENT,
	member_id INT NOT NULL COMMENT '會員 ID',
	plan_id INT NOT NULL COMMENT '方案 ID',
	merchant_trade_no VARCHAR(20) NOT NULL COMMENT 'ECPay 商店訂單編號（唯一）',
	amount INT NOT NULL COMMENT '付款金額（新台幣）',
	status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING' COMMENT '付款狀態',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
	paid_at DATETIME DEFAULT NULL COMMENT '付款完成時間',
	PRIMARY KEY (id),
	UNIQUE KEY uk_payment_order_merchant_trade_no (merchant_trade_no),
	INDEX idx_payment_order_member_id (member_id),
	CONSTRAINT fk_payment_order_member
		FOREIGN KEY (member_id) REFERENCES member (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_payment_order_plan
		FOREIGN KEY (plan_id) REFERENCES subscription_plan (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO subscription_plan (id, code, name, price_twd, duration_days)
VALUES
	(1, 'MONTHLY', '月付方案', 99,  30),
	(2, 'ANNUAL',  '年付方案', 999, 365);

-- 驗證查詢：檢查各表筆數
-- SELECT 'role' AS table_name, COUNT(*) AS total_count FROM role
-- UNION ALL
-- SELECT 'member', COUNT(*) FROM member
-- UNION ALL
-- SELECT 'member_role', COUNT(*) FROM member_role
-- UNION ALL
-- SELECT 'market_index', COUNT(*) FROM market_index
-- UNION ALL
-- SELECT 'member_watchlist', COUNT(*) FROM member_watchlist;

-- 驗證查詢：檢查會員角色關聯
-- SELECT m.email, m.display_name, r.role_name
-- FROM member m
-- JOIN member_role mr ON mr.member_id = m.id
-- JOIN role r ON r.id = mr.role_id;

-- 驗證查詢：檢查會員追蹤清單
-- SELECT m.email, mi.symbol, mi.name, mi.current_price, mi.change_point, mw.added_at
-- FROM member_watchlist mw
-- JOIN member m ON m.id = mw.member_id
-- JOIN market_index mi ON mi.id = mw.market_index_id
-- ORDER BY mw.added_at DESC, mi.id ASC;
