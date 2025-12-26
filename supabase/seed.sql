-- SAMPLE SEED DATA
-- Note: User references (UUIDs) in 'posts' table below are placeholders. 
-- In a real scenario, you should create users in auth.users first, or use a known user ID.

-- Seed Kairanbans
insert into public.kairanbans (title, content, area, author, points, read_count, sent_to_line, created_at)
values 
('令和6年度 自治会費の納入について', '今年度の自治会費の集金を開始します。キャッシュレス決済（Saitama BASE Pay）でも納入可能になりました。詳細は掲示板をご確認ください。', 'さいたま市大宮区', '大宮三丁目町会 役員会', 10, 156, true, '2024-05-14 10:00:00'),
('【重要】不審者情報共有', '昨日夕方、中央公園付近で不審な声かけが発生しました。お子様の登下校には十分ご注意ください。', 'さいたま市大宮区', '防犯部', 5, 89, false, '2024-05-13 18:00:00');

-- Seed Coupons
insert into public.coupons (shop_name, title, required_score, discount, area, image_url)
values
('十万石まんじゅう本舗', 'お買い上げ総額から10%OFF', 100, '10% OFF', 'さいたま市大宮区', 'https://picsum.photos/id/1080/200/200'),
('大宮盆栽村カフェ', 'ドリンク1杯無料（デザート注文時）', 300, 'FREE DRINK', 'さいたま市大宮区', 'https://picsum.photos/id/106/200/200'),
('浦和のうなぎ屋', '肝吸い1杯サービス', 50, 'SERVICE', 'さいたま市浦和区', 'https://picsum.photos/id/1070/200/200');

-- Seed Volunteer Missions
insert into public.volunteer_missions (title, description, points, area, date, current_participants, max_participants)
values
('夏祭りのテント設営', '来週の夏祭りに向けたテント設営のお手伝いを募集します。体力に自信のある方大歓迎！飲み物支給します。', 100, 'さいたま市大宮区', '2024-05-20 09:00', 3, 10),
('高齢者宅のスマホ操作説明', 'スマートフォンの使い方がわからない高齢者の方へ、LINEの送り方を優しく教えていただける方を募集します。', 150, 'さいたま市大宮区', '2024-05-22 14:00', 1, 2);

-- Seed Posts (Requires a valid user_id in production. Using a placeholder UUID for demo)
-- You might get foreign key constraint violation if this user doesn't exist in public.profiles.
-- Ensure to create a profile with this ID or remove this block.
-- insert into public.profiles (id, nickname, role, selected_areas) values ('00000000-0000-0000-0000-000000000000', 'Seed User', 'resident', '{さいたま市大宮区}');

-- insert into public.posts (user_id, category, area, title, content, likes)
-- values ('00000000-0000-0000-0000-000000000000', 'notice', 'さいたま市大宮区', '【重要】氷川神社付近の清掃活動', '今週末、氷川参道の清掃ボランティアを募集します。', 24);
