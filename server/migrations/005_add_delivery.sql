CREATE TABLE IF NOT EXISTS delivery_shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cover TEXT,
  rating REAL DEFAULT 5.0,
  sales INTEGER DEFAULT 0,
  delivery_fee REAL DEFAULT 0,
  min_order REAL DEFAULT 0,
  delivery_time TEXT DEFAULT '30-45分钟',
  distance TEXT DEFAULT '1.2km',
  tags TEXT DEFAULT '[]',
  is_open INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

ALTER TABLE products ADD COLUMN delivery_shop_id INTEGER REFERENCES delivery_shops(id);

INSERT INTO delivery_shops (name, cover, rating, sales, delivery_fee, min_order, delivery_time, distance, tags) VALUES
('老王快餐', '🍱', 4.8, 3256, 3.0, 20, '25-35分钟', '800m', '["好评如潮","快送"]'),
('轻食主义', '🥗', 4.7, 1823, 5.0, 30, '30-40分钟', '1.2km', '["轻食","健康"]'),
('兰州拉面馆', '🍜', 4.6, 2150, 2.0, 15, '20-30分钟', '500m', '["面食","好评"]'),
('湘村馆', '🌶️', 4.5, 980, 4.0, 25, '35-45分钟', '1.5km', '["湘菜","口碑"]'),
('鲜茶工坊', '🧋', 4.9, 5230, 0, 10, '15-25分钟', '300m', '["饮品","新品"]');

INSERT INTO products (category_id, shop_name, title, subtitle, price, original_price, cover, stock, sales, rating, tags, delivery_shop_id) VALUES
(1, '老王快餐', '秘制红烧肉饭', '肥而不腻·入口即化·配时蔬卤蛋', 28.0, 35.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 1280, 4.8, '["热销"]', 1),
(1, '老王快餐', '宫保鸡丁饭', '经典川味·鸡肉嫩滑·花生脆香', 22.0, 28.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 960, 4.7, '["招牌"]', 1),
(1, '老王快餐', '番茄炒蛋饭', '家的味道·酸甜可口·分量十足', 18.0, 22.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 750, 4.6, '["实惠"]', 1),
(1, '轻食主义', '鸡胸肉沙拉碗', '低脂高蛋白·凯撒酱·新鲜时蔬', 32.0, 38.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 560, 4.7, '["低脂"]', 2),
(1, '轻食主义', '牛油果能量碗', '进口牛油果·藜麦·温泉蛋', 38.0, 45.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 420, 4.8, '["推荐"]', 2),
(1, '轻食主义', '全麦三明治套餐', '全麦面包·鲜蔬·配蔬菜沙拉', 26.0, 32.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 380, 4.5, '["轻食"]', 2),
(1, '兰州拉面馆', '兰州牛肉面', '一清二白三红四绿五黄·正宗风味', 25.0, 30.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 1560, 4.8, '["招牌","必点"]', 3),
(1, '兰州拉面馆', '新疆大盘鸡拌面', '鸡肉鲜嫩·土豆软糯·宽面劲道', 32.0, 38.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 680, 4.6, '["特色"]', 3),
(1, '兰州拉面馆', '凉皮', '夏日清爽·酸辣开胃', 12.0, 15.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 890, 4.5, '["爽口"]', 3),
(1, '湘村馆', '小炒肉套餐', '湖南辣椒·土猪肉·锅气十足', 35.0, 42.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 520, 4.6, '["湘菜"]', 4),
(1, '湘村馆', '剁椒鱼头饭', '新鲜花鲢·自制剁椒·鲜辣过瘾', 42.0, 52.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 340, 4.7, '["招牌"]', 4),
(1, '湘村馆', '干锅花菜', '焦香爽脆·湖南风味', 22.0, 28.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 280, 4.4, '["素菜"]', 4),
(1, '鲜茶工坊', '招牌杨枝甘露', '芒果+西柚+椰奶·经典港式', 18.0, 22.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 2340, 4.9, '["招牌"]', 5),
(1, '鲜茶工坊', '厚芋泥奶茶', '手工芋泥·鲜牛乳·Q弹珍珠', 16.0, 20.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 1850, 4.8, '["推荐"]', 5),
(1, '鲜茶工坊', '柠檬绿茶', '清新解暑·鲜切柠檬', 10.0, 13.0, 'https://dopamine-1313011159.cos.ap-guangzhou.myqcloud.com/dopamine/public/34aaf35260ce76b8-tb_image_share_1785228263327.png', 999, 1580, 4.7, '["清爽"]', 5);
