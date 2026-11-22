-- P2000 ve sütun uzunluğu hatalarını tamamen çözen migration komutları
ALTER TABLE MapProject MODIFY COLUMN description TEXT;
ALTER TABLE Layer MODIFY COLUMN iconUrl TEXT;
ALTER TABLE Feature MODIFY COLUMN title TEXT;
ALTER TABLE Feature MODIFY COLUMN description TEXT;
ALTER TABLE Feature MODIFY COLUMN iconUrl TEXT;
