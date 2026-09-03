-- Simplified Campaigns Table for Gmail Native Mail Merge Automation
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,

    spreadsheet_title VARCHAR(255) NULL,
    spreadsheet_url TEXT NULL,
    recipient_column VARCHAR(100) NOT NULL DEFAULT 'email',

    subject TEXT NOT NULL,
    body_template LONGTEXT NOT NULL,

    scheduled_at DATETIME NOT NULL,

    status ENUM(
        'PENDING',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    ) DEFAULT 'PENDING',

    started_at DATETIME NULL,
    completed_at DATETIME NULL,

    last_error TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
