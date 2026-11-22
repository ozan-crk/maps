-- MapProject açıklama sütununu VARCHAR(191) yerine TEXT yaparak P2000 hatasını kalıcı çözer
ALTER TABLE MapProject MODIFY COLUMN description TEXT;
ALTER TABLE Layer MODIFY COLUMN name VARCHAR(255);
